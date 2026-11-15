/* visual.js — Parte VISUAL: canvas (sprites, sol, tormentas de arena y solar) y UI del navegador.
   Depende de game.js (Game, FORECAST_AHEAD) y de data.js, stats-decisions.js, events.js, lang.js.
   Cargar DESPUÉS de game.js. En node no hace nada. */

if (typeof document !== 'undefined') {
  const $ = sel => document.querySelector(sel);
  let game = new Game();

  /* Audio opcional: si js/audio.js no está, el juego sigue funcionando en silencio. */
  const SND = (typeof NassaAudio !== 'undefined') ? NassaAudio : null;
  const snd = name => { if (SND) SND.play(name); };

  /* Nodos que se actualizan en cada render: se buscan una sola vez. */
  const bars = {};
  document.querySelectorAll('.bar').forEach(el => {
    bars[el.dataset.k] = {
      el,
      label: el.querySelector('label'),
      fill: el.querySelector('.fill'),
      val: el.querySelector('.val'),
    };
  });
  const capEl = document.querySelector('.cap');

  /* Sprites: cada SVG está dibujado a 1 unidad = 1 píxel del canvas (320x180),
     así que con escala 1 se pintan 1:1 y quedan nítidos.
     SPRITE_SIZE = tamaño del lienzo del SVG (sirve de respaldo si falla la carga).
     SPRITE_BOX  = zona VISIBLE dentro de ese lienzo: [x, y, ancho, alto], sin el margen transparente.
     LAYOUT      = dónde va cada objeto en la escena (320x180):
                   cx    = centro horizontal de lo visible
                   base  = línea de suelo (y donde se apoya el objeto)
                   scale = escala (1 = píxel a píxel; 1.5 y 2 también se ven bien, evita valores raros). */
  const SPRITE_SIZE = {
    sky: [320, 38], ground: [320, 141],
    sun: [40, 40], hab: [128, 128], hab_crops: [128, 128], solar: [92, 71], rover: [128, 128],
  };
  const SPRITE_BOX = {
    hab:       [0, 50, 128, 74],
    hab_crops: [0, 50, 128, 74],
    solar:     [3, 4, 83, 64],
    rover:     [2, 45, 123, 79],
  };
  const LAYOUT = {
    hab:   { cx: 108, base: 158, scale: 1.5 },  // base grande, a la izquierda (192x111 px en pantalla)
    solar: { cx: 264, base: 152, scale: 1 },    // panel a la derecha, bajo el sol
    rover: { cx: 246, base: 76,  scale: .4 },   // rover al fondo, encima del panel: lejos = más arriba y más pequeño
  };
  const sprites = {};
  Object.keys(SPRITE_SIZE).forEach(k => {
    const i = new Image();
    i.onload = () => { i.ok = true; drawScene(); };
    i.onerror = () => { i.bad = true; };
    i.src = 'assets/sprites/' + k + '.svg';
    sprites[k] = i;
  });

  const cv = $('#scene'), ctx = cv.getContext('2d');
  const W = 320, H = 180;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastFrame = 0;

  /* ---------- tormenta de arena: partículas, cortinas y capas de polvo ---------- */
  const DUST_POWER = { light: .45, moderate: .72, severe: 1 };
  const SOLAR_PERIOD = 2;   // 37 % más corto que el pulso normal (3.2 s)
  const GRAIN_COLORS = ['#ffe3bd', '#f7c98f', '#e0a566'];

  const grains = Array.from({ length: 150 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    w: Math.random() < .3 ? 2 : 1,
    spd: 50 + Math.random() * 150,
    wob: Math.random() * 6.2832,
    drift: -8 + Math.random() * 16,
    a: .25 + Math.random() * .5,
    c: GRAIN_COLORS[(Math.random() * GRAIN_COLORS.length) | 0],
  }));
  const streaks = Array.from({ length: 22 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    len: 12 + Math.random() * 40,
    spd: 120 + Math.random() * 180,
    a: .08 + Math.random() * .22,
  }));

  function updateParticles(t, dt, strength){
    // el viento sube y baja como una ventolera, no a ritmo de reloj
    const gust = .55 + .45 * Math.sin(t * .9) * Math.sin(t * .37 + 1.7);
    const wind = (.7 + strength) * (.75 + .35 * gust);

    for (const g of grains){
      g.x += g.spd * wind * dt;
      g.y += (Math.sin(t * 1.8 + g.wob) * 14 + g.drift) * dt;
      if (g.x > W + 4){ g.x = -4 - Math.random() * 16; g.y = Math.random() * H; }
      if (g.y < 0) g.y += H; else if (g.y > H) g.y -= H;
    }
    for (const s of streaks){
      s.x += s.spd * wind * dt;
      if (s.x > W + s.len){ s.x = -s.len; s.y = Math.random() * H; }
    }
  }

  function dustBand(t, yBase, amp, freq, speed, color, alpha, strength){
    ctx.globalAlpha = alpha * strength;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8){
      const y = yBase
        + Math.sin(x * freq + t * speed) * amp
        + Math.sin(x * freq * .53 - t * speed * 1.6) * amp * .5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawDustBack(t, strength){
    if (!strength) return;
    dustBand(t, 54, 7, .045, .7, '#c98d52', .24, strength);
    dustBand(t, 82, 9, .035, .9, '#b9793f', .20, strength);

    const layers = [
      { y: 52,  h: 26, spd: 6,  a: .16, c: '#d9a066' },
      { y: 84,  h: 34, spd: 11, a: .19, c: '#c98d52' },
      { y: 118, h: 38, spd: 17, a: .22, c: '#b9793f' },
    ];
    for (let i = 0; i < layers.length; i++){
      const L = layers[i];
      const period = 150 + i * 26;
      const off = (t * L.spd * (.6 + strength)) % period;
      ctx.globalAlpha = L.a * (.5 + .5 * strength);
      ctx.fillStyle = L.c;
      for (let x = -period - off; x < W + period; x += period){
        ctx.beginPath();
        ctx.ellipse(x + period * .5,  L.y + Math.sin(t + i) * 3, period * .42, L.h * .55, 0, 0, 6.2832);
        ctx.ellipse(x + period * .82, L.y + 5, period * .32, L.h * .42, 0, 0, 6.2832);
        ctx.ellipse(x + period * .18, L.y + 6, period * .30, L.h * .40, 0, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawDustFront(t, strength){
    for (const g of grains){
      ctx.globalAlpha = g.a * (.5 + .5 * strength);
      ctx.fillStyle = g.c;
      ctx.fillRect(Math.round(g.x), Math.round(g.y), g.w, 1);
    }
    for (const s of streaks){
      ctx.globalAlpha = s.a * strength;
      ctx.fillStyle = '#ffe9c8';
      ctx.fillRect(Math.round(s.x), Math.round(s.y), Math.round(s.len), 1);
    }
    dustBand(t, 112, 8, .055, 1.4, '#a9682f', .20, strength);
    dustBand(t, 140, 10, .07, 1.9, '#8f521f', .26, strength);

    const haze = ctx.createLinearGradient(0, 60, 0, H);
    haze.addColorStop(0, 'rgba(150,85,31,0)');
    haze.addColorStop(1, 'rgba(150,85,31,' + (.28 * strength) + ')');
    ctx.globalAlpha = 1;
    ctx.fillStyle = haze;
    ctx.fillRect(0, 60, W, H - 60);
  }

  function drawSprite(k, x, y, scale = 1){
    const i = sprites[k], [bw, bh] = SPRITE_SIZE[k];
    const w = bw * scale, h = bh * scale;
    if (i && i.ok) ctx.drawImage(i, x - (w - bw) / 2, y - (h - bh) / 2, w, h);
    else { ctx.fillStyle = '#777'; ctx.fillRect(x, y, bw, bh); }
  }

  /* Dibuja solo la parte visible del sprite `k`, apoyada en el suelo según LAYOUT[layoutKey]. */
  function placeSprite(k, layoutKey = k){
    const i = sprites[k], [sx, sy, sw, sh] = SPRITE_BOX[k], L = LAYOUT[layoutKey];
    const w = Math.round(sw * L.scale), h = Math.round(sh * L.scale);
    const x = Math.round(L.cx - w / 2), y = Math.round(L.base - h);   // enteros: sin píxeles borrosos
    if (i && i.ok) ctx.drawImage(i, sx, sy, sw, sh, x, y, w, h);
    else { ctx.fillStyle = '#777'; ctx.fillRect(x, y, w, h); }
  }

  /* El sol palpita siempre; en tormenta solar late más rápido y se enciende en naranja. */
  function drawSun(t, storm){
    const period = storm ? .55 : 3.2;
    const pulse = .5 + .5 * Math.sin(t * Math.PI * 2 / period);
    const cx = 281, cy = 6;

    if (storm){
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 54);
      glow.addColorStop(0, 'rgba(255,150,40,' + (.35 + .25 * pulse) + ')');
      glow.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 54, cy - 54, 108, 108);
    }

    const scale = 1 + (storm ? .16 : .05) * (reduceMotion ? .5 : pulse);
    ctx.save();
    if (storm) ctx.filter = 'saturate(1.7) hue-rotate(-14deg) brightness(1.08)';
    drawSprite('sun', 261, -14, scale);
    ctx.restore();
  }

  /* Ondas de radiación que salen del sol y se expanden como olas del mar. */
  function drawSolarStorm(t){
    const cx = 281, cy = 6;
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 4; i++){
      const age = ((t * .45) + i / 4) % 1;          // 0 → nace en el sol, 1 → se desvanece
      const r = 18 + 300 * age;                      // nace junto al sol y se expande
      const amp = 1.5 + 4.5 * age;                   // la onda se arruga al crecer
      const fade = Math.sin(age * Math.PI);          // entra y sale suave: sin corte en el bucle
      ctx.globalAlpha = fade * .38;
      ctx.strokeStyle = i % 2 ? '#ffb347' : '#ff5a2a';
      ctx.beginPath();
      for (let a = 0; a <= 6.2832; a += .1){
        const rr = r + Math.sin(a * 8 + t * 4 + i) * amp * fade;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawScene(now = performance.now()){
    const t = now / 1000;
    const dt = Math.min(.05, lastFrame ? (now - lastFrame) / 1000 : .016);
    lastFrame = now;

    ctx.imageSmoothingEnabled = false;
    // cielo y suelo; el horizonte queda alto (y = 38) como en el boceto
    const skyImg = sprites.sky, gndImg = sprites.ground;
    if (skyImg && skyImg.ok) drawSprite('sky', 0, 0);
    else { ctx.fillStyle = '#a4552e'; ctx.fillRect(0, 0, W, 38); ctx.fillStyle = '#7a3b22'; ctx.fillRect(0, 37, W, 2); }
    if (gndImg && gndImg.ok) drawSprite('ground', 0, 39);
    else { ctx.fillStyle = '#bf6638'; ctx.fillRect(0, 39, W, 56); ctx.fillStyle = '#cc7240'; ctx.fillRect(0, 95, W, 45); ctx.fillStyle = '#d97f46'; ctx.fillRect(0, 140, W, 40); }

    const storm = game.alertKey === 'alert.storm' || game.alertKey === 'alert.absorbed';
    const dusty = game.weather.dusty;
    const strength = dusty ? (DUST_POWER[game.weather.dustLevelId] || .7) : 0;
    const hasCrops = game.decisions.growing.length > 0;   // cultivos en marcha → base con invernadero verde

    if (strength && !reduceMotion) updateParticles(t, dt, strength);

    drawSun(t, storm);
    drawDustBack(t, strength);              // polvo de fondo

    ctx.globalAlpha = 1 - .55 * strength;   // la arena difumina las estructuras
    placeSprite('rover');                   // el más lejano: se dibuja primero
    placeSprite(hasCrops ? 'hab_crops' : 'hab', 'hab');
    placeSprite('solar');
    ctx.globalAlpha = 1;

    if (dusty){
      ctx.fillStyle = 'rgba(78,34,10,' + (.22 * strength) + ')';  // oscurece la escena
      ctx.fillRect(0, 0, W, H);
      drawDustFront(t, strength);           // granos, ráfagas y neblina
    }
    if (storm){
      drawSolarStorm(t);                     // ondas de radiación
      const flash = .5 + .5 * Math.sin(t * Math.PI * 2 / SOLAR_PERIOD);
      ctx.fillStyle = 'rgba(255,70,50,' + (.10 + .07 * (reduceMotion ? .5 : flash)) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* Números del polvo que usan varios textos (así nunca se desincronizan con la config). */
  function msgVars(){
    const W = SpaceWeather.CFG;
    return { days: game.weather.dusty ? game.weather.dustLeft : W.DUST_MAX,
             low: game.weather.dusty ? game.weather.dustIncome : W.DUST_LEVELS[W.DUST_LEVELS.length - 1].income,
             level: game.weather.dusty ? t('lvl.' + game.weather.dustLevelId) : '', normal: CFG.INCOME };
  }

  function renderMsg(m){
    const v = Object.assign(msgVars(), m.vars || {});
    if (m.key === 'log.act') return t('log.act', { name: t('act.' + v.id + '.name'), hint: t('act.' + v.id + '.hint') });
    if (m.key === 'log.absorbed' || m.key === 'log.stormHit'){
      const ev = v.ev;
      return t(m.key, { date: ev.date, label: L(ev, 'label'), note: L(ev, 'note'), hit: v.hit, had: v.had, need: v.need });
    }
    if (m.key === 'log.dustStart') return t(m.key, Object.assign(v, { level: t('lvl.' + v.levelId) }));
    return t(m.key, v);
  }

  const ICON = { radiation: '☢', dust: '🌪' };

  /* Línea del evento que se avisa: cuenta atrás. Rojo para solar, naranja para polvo. */
  function forecastLineHTML(){
    const f = game.forecast, type = f.roll.type, left = f.target - game.sol;
    const line = t('cd.' + type + (left <= 0 ? '.now' : ''), { n: left });
    return line;
  }

  /* medidor de escudo: tu escudo esa noche frente al escudo necesario (solo tormentas solares) */
  function fillShieldGauge(type, ev){
    const box = $('#fcGauge');
    box.hidden = type !== 'radiation';
    if (type !== 'radiation') return;

    const need = SpaceWeather.need(ev);
    // proyección real: el escudo se desgasta cada noche hasta el evento
    const yours = game.projectedShield(game.forecast.target);
    const ok = yours >= need;

    $('#fcFill').style.width = Math.min(100, yours) + '%';
    $('#fcMark').style.left = Math.min(100, need) + '%';
    $('#fcNeedLbl').textContent = t('fc.need');
    $('#fcNeed').textContent = need;

    const v = $('#fcVerdict');
    v.textContent = ok ? t('fc.ok') : t('fc.short', { n: need - yours });
    v.className = 'verdict ' + (ok ? 'ok' : 'bad');
  }

  /* ---------- aviso de pronóstico (solo informa) ---------- */
  function fillForecast(){
    const f = game.forecast, ev = f.roll.ev, type = f.roll.type;
    const left = f.target - game.sol;

    $('#fcCard').dataset.type = type;   // el CSS cambia colores según el tipo
    $('#fcTitle').textContent = t('fc.title.' + type);
    $('#fcWhen').textContent = t('fc.when', { n: left, target: f.target });

    // fila de soles: desde hoy hasta la noche del evento
    const track = $('#fcTrack');
    track.innerHTML = '';
    for (let s = game.sol; s <= f.target; s++){
      const p = document.createElement('span');
      const isNow = s === game.sol, isTarget = s === f.target;
      p.className = 'pip' + (isNow ? ' now' : '') + (isTarget ? ' target' : '');
      p.textContent = isTarget ? ICON[type] : s;
      track.appendChild(p);
    }

    $('#fcArt').dataset.type = type;
    $('#fcEvent').textContent = type === 'radiation' ? ev.date + ' — ' + L(ev, 'label') : '';
    $('#fcNote').textContent = type === 'radiation' ? L(ev, 'note') : '';
    const extra = type === 'radiation' ? { dmg: SpaceWeather.need(ev) }
                                       : { days: f.roll.days, low: f.roll.level.income, level: t('lvl.' + f.roll.level.id) };
    $('#fcText').textContent = t('fc.' + type, Object.assign(msgVars(), extra));
    fillShieldGauge(type, ev);
    $('#fcOk').textContent = t('fc.continue');
  }

  let forecastWasOpen = false;
  function syncForecast(){
    const open = !!game.forecast && game.forecastOpen && !game.over;
    if (open && !forecastWasOpen) snd('alert');
    forecastWasOpen = open;
    $('#forecast').hidden = !open;
    if (open) fillForecast();
  }

  /* Bloque de eventos: cada línea es independiente y del mismo tamaño.
     Orden de prioridad: tormenta de arena activa primero, luego el próximo evento. */
  function renderEvents(){
    const dust = $('#dustLine');
    dust.hidden = !(game.weather.dusty && !game.over);
    if (!dust.hidden) dust.textContent = t('dust.active', Object.assign(msgVars(), { n: game.weather.dustLeft }));

    const fl = $('#forecastLine');
    const showForecast = !!game.forecast && !game.over;
    fl.hidden = !showForecast;
    fl.className = 'event-line' + (showForecast && game.forecast.roll.type === 'dust' ? ' dust' : ' solar');
    if (showForecast){
      let txt = forecastLineHTML();
      // tormenta solar: el escudo necesario (valor fijo) siempre a la vista
      if (game.forecast.roll.type === 'radiation')
        txt += ' · ' + t('cd.need', { need: SpaceWeather.need(game.forecast.roll.ev) });
      else {   // tormenta de arena: su intensidad y cuánto recargarás por sol
        const lv = game.forecast.roll.level;
        txt += ' · ' + t('cd.level', { level: t('lvl.' + lv.id), days: game.forecast.roll.days, low: lv.income });
      }
      fl.textContent = txt;
    }
  }

  function render(){
    const s = game.stats, d = game.decisions;
    $('#solLine').textContent = t('sol', { n: game.sol, total: CFG.WIN_SOL }) + (game.weather.dusty ? t('dust') : '');
    ['power', 'oxygen', 'shield', 'food'].forEach(k => {
      const b = bars[k];
      if (!b) return;
      const name = t(k);
      if (b.label.textContent !== name) b.label.textContent = name;
      b.fill.style.width = s[k] + '%';
      b.val.textContent = Math.round(s[k]);
      b.el.classList.toggle('low', s[k] <= 20);
    });
    if (capEl) capEl.style.left = s.maxO2 + '%';

    renderEvents();

    // cultivos: línea propia, debajo de los eventos
    const growing = d.growing;
    const due = growing.length ? Math.min(...growing.map(c => c.due)) : 0;
    $('#crops').textContent = growing.length
      ? t('cropsLine', { n: growing.length, d: Math.max(1, due - game.sol) }) : '';

    $('#alert').textContent = game.alertKey ? t(game.alertKey, msgVars()) : '';
    $('#nextSol').textContent = t('endSol');

    const active = d.active();
    document.querySelectorAll('#btns button').forEach(b => {
      const id = b.dataset.act;
      b.classList.toggle('active', active.has(id));
      b.disabled = !d.canDo(id) && !active.has(id);   // una acción activa siempre se puede cancelar
    });

    $('#log').innerHTML = game.log.entries.map(m => '<li>' + renderMsg(m) + '</li>').join('');
    drawScene();
    syncForecast();
    if (game.over) showEnd();
  }

  function showEnd(){
    const title = $('#endTitle');
    const s = game.stats;
    title.textContent = t(game.won ? 'end.win' : 'end.lose');
    title.className = game.won ? 'success' : 'failed';
    $('#endStats').textContent =
      t('end.sols', { n: game.won ? CFG.WIN_SOL : game.sol - 1 }) + '\n' +
      t('end.o2', { n: Math.round(s.oxygen), max: s.maxO2 }) + '\n' +
      t('end.food', { n: Math.round(s.food) }) + '\n' +
      t('end.score', { n: game.score() });
    $('#endLearn').textContent = game.won
      ? t('end.winLearn')
      : t('end.lastLog') + renderMsg(game.log.first);
    $('#endScreen').hidden = false;
  }

  const ACT_ICON = { recycler: '💧', shieldUp: '🛡️', crops: '🌱' };
  const btns = $('#btns');
  for (const id of Object.keys(ACTIONS)){
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.act = id;
    b.onclick = () => {
      const wasActive = game.decisions.active().has(id);
      game.toggle(id);
      if (!wasActive) snd('confirm');
      render();
    };
    btns.appendChild(b);
  }

  function buildActionLabels(){
    document.querySelectorAll('#btns button').forEach(b => {
      const id = b.dataset.act;
      b.innerHTML = '<span class="ico" aria-hidden="true"></span>' +
                    '<span class="label"><span class="name"></span><small></small></span>';
      b.querySelector('.ico').textContent = ACT_ICON[id] || '▸';
      b.querySelector('.name').textContent = t('act.' + id + '.name');
      b.querySelector('small').textContent = t('act.' + id + '.hint');
    });
  }

  /* panel "¿Qué es real?": muestra el conjunto de eventos activo (en vivo o archivado) */
  function renderReal(){
    const rb = $('#realBody');
    rb.innerHTML = '';
    $('#real summary').textContent = t('whatsReal');
    const add = (tag, html) => { const e = document.createElement(tag); e.innerHTML = html; rb.appendChild(e); return e; };
    add('p', t('real.stormsIntro'));
    const ul = add('ul', '');
    game.weather.pool.forEach(ev => {
      const li = document.createElement('li');
      li.textContent = ev.date + ' — ' + L(ev, 'label') + ': ' + L(ev, 'note');
      ul.appendChild(li);
    });
    add('p', t('real.radlab', { instrument: RADLAB.instrument, rate: RADLAB.absorbed_dose_rate_uGy_per_h, note: L(RADLAB, 'note') }));
    add('p', L(REAL_FACTS, 'dust'));
    add('p', L(REAL_FACTS, 'comm'));
  }

  function setLang(lang){
    LANG = lang;
    try { localStorage.setItem('lang', lang); } catch (e) {}
    document.documentElement.lang = lang;
    $('#gameTitle').textContent = t('title');
    $('#langBtn').textContent = t('langBtn');
    $('#restart').textContent = t('flyAgain');
    $('#hud').dataset.title = t('ui.telemetry');
    $('#actions').dataset.title = t('ui.actions');
    $('#logPanel').dataset.title = t('ui.log');
    if (SND) SND.setLabels({
      musicOn: t('audio.musicOn'), musicOff: t('audio.musicOff'),
      sfxOn: t('audio.sfxOn'), sfxOff: t('audio.sfxOff'),
    });
    buildActionLabels();
    renderReal();
    render();
  }
  $('#langBtn').onclick = () => setLang(LANG === 'en' ? 'es' : 'en');

  /* un clic suave en cualquier botón; los efectos importantes suman su propio sonido */
  document.addEventListener('click', e => {
    if (e.target.closest('button') && !e.target.closest('#nextSol, #btns')) snd('click');
  });

  $('#nextSol').onclick = () => {
    const before = new Set(game.log.entries);
    game.nextSol();
    const added = game.log.entries.filter(e => !before.has(e));
    if (game.over) snd(game.won ? 'win' : 'fail');
    else if (game.alertKey) snd('alert');
    else if (added.some(e => e.key === 'log.cropsDone')) snd('harvest');
    else snd('confirm');
    render();
  };
  $('#restart').onclick = () => {
    game = new Game();
    forecastWasOpen = false;
    $('#endScreen').hidden = true;
    renderReal();
    render();
  };
  $('#fcOk').onclick = () => { game.forecastOpen = false; render(); };

  setLang(LANG);

  /* animación continua solo si el usuario no pidió movimiento reducido */
  if (!reduceMotion){
    (function frame(now){
      if (!document.hidden) drawScene(now);
      requestAnimationFrame(frame);
    })(performance.now());
  }

  /* datos vivos: si DONKI responde, sustituye el mazo; si no, quedan los archivados.
     El estado de la fuente ya no se muestra en pantalla. */
  SpaceWeather.loadLive().then(events => {
    if (events) game.weather.setPool(events, 'live');
    renderReal();
    render();
  });
}