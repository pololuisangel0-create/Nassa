/* game.js — Log, Game (orquesta cada sol y el aviso de pronóstico) y UI del navegador.
   Stats y Decisions: stats-decisions.js. Clima: events.js. Textos: lang.js. Datos: data.js. */

/* Con cuántos soles de antelación aparece el aviso de tormenta. */
const FORECAST_AHEAD = 2;

/* En node los módulos no comparten ámbito global: se exponen con los mismos nombres que en el navegador. */
if (typeof module !== 'undefined') {
  Object.assign(globalThis,
    require('./data.js'),
    require('./stats-decisions.js'),
    { SpaceWeather: require('./events.js').SpaceWeather });
}

/* ---------- Log: bitácora de entradas { key, vars } ---------- */
class Log {
  constructor(max = 200){ this.entries = []; this.max = max; }
  push(key, vars){
    this.entries.unshift({ key, vars: vars || {} });
    if (this.entries.length > this.max) this.entries.pop();
  }
  get length(){ return this.entries.length; }
  get first(){ return this.entries[0]; }
  /* deshacer: conserva solo las `len` entradas más antiguas */
  truncateTo(len){ this.entries = this.entries.slice(this.entries.length - len); }
}

/* ---------- Game: orquesta cada sol ---------- */
class Game {
  constructor(rng = Math.random){
    this.sol = 1;
    this.over = false;
    this.won = false;
    this.warned = { shield: false, power: false };
    this.alertKey = '';
    this.stats = new Stats(CFG.START);
    this.log = new Log();
    this.decisions = new Decisions(this);
    this.weather = new SpaceWeather(rng);
    this.forecast = null;         // { target, roll }: evento ya sorteado para la noche `target`
    this.forecastOpen = false;    // ¿mostrar el aviso ahora?
    this.radiationKill = false;   // true si una tormenta solar mató al jugador
    this.log.push('log.intro', { n: CFG.WIN_SOL });
    this._prepareForecast();
  }

  /* botón de acción: si ya está activo, lo cancela */
  toggle(id){
    if (this.decisions.active().has(id)) this.decisions.undo(id);
    else this.decisions.do(id);
  }

  nextSol(){
    if (this.over) return;
    this.decisions.resetForSol();
    this.alertKey = '';
    this.forecastOpen = false;
    this._warnLow();

    const s = this.stats;

    // ---- pasa la noche ----
    // recarga solar: solo la tormenta de arena la reduce (según su intensidad)
    let income = CFG.INCOME;
    if (this.weather.dusty) income = Math.min(income, this.weather.dustIncome);
    s.add('power', income);
    s.capOxygen();
    s.add('oxygen', -CFG.O2_DRAIN);
    s.add('shield', -CFG.SHIELD_DECAY);
    s.add('food', -CFG.FOOD_DRAIN);
    if (this.weather.tickDust()) this.log.push('log.dustEnd');

    // cosechas que maduran esta noche
    for (const c of this.decisions.harvest(this.sol)){
      s.add('food', c.food);
      this.log.push('log.cropsDone', { n: c.food });
    }

    // evento de esta noche: el que se anunció en el aviso, o uno nuevo si no hubo aviso
    const eventTonight = this.weather.isEventDay(this.sol);
    if (eventTonight){
      let roll;
      if (this.forecast && this.forecast.target === this.sol){
        roll = this.forecast.roll;
        this.forecast = null;
      } else {
        // el polvo ya avanzó esta noche: si aún queda, no puede empezar otro encima
        roll = this.weather.draw({ noDust: this.weather.dustBusy() });
      }
      this._applyWeather(roll);
    }

    // ---- única regla de derrota: al terminar la noche, ninguna barra puede estar en 0 ----
    const dead = this._deadReason();
    if (dead) return this._fail(dead);

    if (eventTonight) this._announceNextEvent();
    if (this.sol >= CFG.WIN_SOL){ this.over = true; this.won = true; }
    else { this.sol++; this._prepareForecast(); }
  }

  /* Próximo sol con evento, hasta el final de la partida. */
  _nextEventSol(){
    for (let t = this.sol + 1; t <= CFG.WIN_SOL; t++){
      if (this.weather.isEventDay(t)) return t;
    }
    return null;
  }

  /* Si el próximo evento está a FORECAST_AHEAD soles o menos, sortea su tormenta y abre el aviso.
     Regla: NUNCA hay dos avisos a la vez. Mientras haya uno pendiente no se prepara otro,
     así un aviso nunca se pisa ni se sortea de nuevo. */
  _prepareForecast(){
    if (this.forecast) return;
    const target = this._nextEventSol();
    if (target === null || target - this.sol > FORECAST_AHEAD) return;
    // si ahora hay una tormenta de arena en curso no se avisa otra, aunque termine antes del evento
    this.forecast = { target, roll: this.weather.draw({ noDust: this.weather.dustBusy() }) };
    this.forecastOpen = true;
  }

  /* Escudo que tendrás la noche `target` si no haces nada más:
     cada noche (incluida la del evento) el escudo se desgasta ANTES de que llegue la tormenta. */
  projectedShield(target){
    const nights = Math.max(1, target - this.sol + 1);
    return Math.max(0, Math.round(this.stats.shield - CFG.SHIELD_DECAY * nights));
  }

  /* Tras un evento, avisa de que vienen más y cuándo, para que no sorprenda. */
  _announceNextEvent(){
    const next = this._nextEventSol();
    if (next !== null) this.log.push('log.nextAlert', { sol: next, ahead: FORECAST_AHEAD });
  }

  score(){
    return Math.round(this.stats.oxygen + this.stats.food + this.stats.shield);
  }

  /* Clave del mensaje de derrota si alguna de las 4 barras está en 0, o null si todo va bien. */
  _deadReason(){
    const s = this.stats;
    if (this.radiationKill) return 'log.failRadiation';
    if (s.oxygen <= 0) return 'log.failO2';
    if (s.shield <= 0) return 'log.failShield';
    if (s.power  <= 0) return 'log.failPower';
    if (s.food   <= 0) return 'log.failFood';
    return null;
  }

  _fail(key){
    this.over = true;
    this.log.push(key);
  }

  _warnLow(){
    const s = this.stats, W = CFG.WARN_LOW;
    if (s.shield > W) this.warned.shield = false;
    if (s.power  > W) this.warned.power  = false;
    if (s.shield <= W && s.shield > 0 && !this.warned.shield){
      this.warned.shield = true;
      this.log.push('log.lowShield');
    }
    if (s.power <= W && s.power > 0 && !this.warned.power){
      this.warned.power = true;
      this.log.push('log.lowPower');
    }
  }

  /* Solo hay dos tipos de evento: tormenta solar o tormenta de arena. */
  _applyWeather(r){
    if (r.type === 'radiation') this._radiation(r.ev);
    else {
      const days = this.weather.startDust(r.level, r.days);
      this.alertKey = 'alert.dust';
      this.log.push('log.dustStart', { days, low: this.weather.dustIncome, levelId: r.level.id });
    }
  }

  _radiation(ev){
    const s = this.stats;
    const had = Math.round(s.shield), need = SpaceWeather.need(ev);
    const imp = SpaceWeather.impact(s.shield, ev);
    if (imp.absorbed){
      s.add('shield', -imp.shieldLoss);
      this.alertKey = 'alert.absorbed';
      this.log.push('log.absorbed', { date: ev.date, hit: imp.shieldLoss, ev });
    } else {
      // radiación mortal: la misión termina esta misma noche
      this.radiationKill = true;
      this.alertKey = 'alert.storm';
      this.log.push('log.stormHit', { date: ev.date, had, need, ev });
    }
  }
}

/* ---------- UI del navegador (se omite en node) ---------- */
if (typeof document !== 'undefined') {
  const $ = sel => document.querySelector(sel);
  let game = new Game();

  const sprites = {};
  ['sun', 'flare', 'hab', 'solar', 'rover'].forEach(k => {
    const i = new Image();
    i.onload = () => { i.ok = true; drawScene(); };
    i.onerror = () => { i.bad = true; };
    i.src = 'assets/sprites/' + k + '.svg';
    sprites[k] = i;
  });

  const cv = $('#scene'), ctx = cv.getContext('2d');

  function drawSprite(k, x, y, s){
    const i = sprites[k];
    if (i && i.ok) ctx.drawImage(i, x, y, 16 * s, 16 * s);
    else { ctx.fillStyle = '#777'; ctx.fillRect(x, y, 16 * s, 16 * s); }
  }

  function drawScene(){
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#a4552e'; ctx.fillRect(0, 0, 320, 50);
    ctx.fillStyle = '#c06a3a'; ctx.fillRect(0, 50, 320, 50);
    ctx.fillStyle = '#d97f46'; ctx.fillRect(0, 100, 320, 40);
    ctx.fillStyle = '#8a3f22'; ctx.fillRect(0, 140, 320, 40);
    ctx.fillStyle = '#a05028'; ctx.fillRect(0, 140, 320, 5);

    const storm = game.alertKey === 'alert.storm' || game.alertKey === 'alert.absorbed';
    drawSprite(storm ? 'flare' : 'sun', 244, 12, 4);
    drawSprite('hab',   36, 104, 4);
    drawSprite('solar', 128, 96, 4);
    drawSprite('rover', 216, 96, 4);

    if (game.weather.dusty){
      ctx.fillStyle = 'rgba(200,110,50,0.45)';
      [18, 63, 108].forEach(y => ctx.fillRect(0, y, 320, 12));
      ctx.fillStyle = 'rgba(190,100,40,0.15)'; ctx.fillRect(0, 0, 320, 140);
    }
    if (storm){ ctx.fillStyle = 'rgba(255,70,50,0.16)'; ctx.fillRect(0, 0, 320, 180); }
  }

  /* Números del polvo que usan varios textos (así nunca se desincronizan con la config). */
  function msgVars(){
    const W = SpaceWeather.CFG;
    return { min: W.DUST_MIN, max: W.DUST_MAX, days: game.weather.dusty ? game.weather.dustLeft : W.DUST_MAX,
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
    // proyección real: el escudo se desgasta cada noche hasta la del evento
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

  function syncForecast(){
    const open = !!game.forecast && game.forecastOpen && !game.over;
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
    $('#gameTitle').textContent = t('title');
    $('#solLine').textContent = t('sol', { n: game.sol, total: CFG.WIN_SOL }) + (game.weather.dusty ? t('dust') : '');
    ['power', 'oxygen', 'shield', 'food'].forEach(k => {
      const bar = document.querySelector('.bar[data-k="' + k + '"]');
      bar.querySelector('label').textContent = t(k);
      bar.querySelector('.fill').style.width = s[k] + '%';
      bar.querySelector('.val').textContent = Math.round(s[k]);
    });
    const cap = document.querySelector('.cap');
    if (cap) cap.style.left = s.maxO2 + '%';

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

  const btns = $('#btns');
  for (const id of Object.keys(ACTIONS)){
    const b = document.createElement('button');
    b.dataset.act = id;
    b.onclick = () => { game.toggle(id); render(); };
    btns.appendChild(b);
  }

  function buildActionLabels(){
    document.querySelectorAll('#btns button').forEach(b => {
      const id = b.dataset.act;
      b.textContent = t('act.' + id + '.name');
      let small = b.querySelector('small');
      if (!small){ small = document.createElement('small'); b.appendChild(small); }
      small.textContent = t('act.' + id + '.hint');
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
    buildActionLabels();
    renderReal();
    render();
  }
  $('#langBtn').onclick = () => setLang(LANG === 'en' ? 'es' : 'en');

  $('#nextSol').onclick = () => { game.nextSol(); render(); };
  $('#restart').onclick = () => {
    game = new Game();
    $('#endScreen').hidden = true;
    renderReal();
    render();
  };
  $('#fcOk').onclick = () => { game.forecastOpen = false; render(); };

  setLang(LANG);

  /* datos vivos: si DONKI responde, sustituye el mazo; si no, quedan los archivados.
     El estado de la fuente ya no se muestra en pantalla. */
  SpaceWeather.loadLive().then(events => {
    if (events) game.weather.setPool(events, 'live');
    renderReal();
    render();
  });

} else if (typeof module !== 'undefined' && require.main === module) {
  /* ---------- pruebas en node: node js/game.js ---------- */
  function simulate(strategy){
    const g = new Game();
    for (let d = 0; d < 60 && !g.over; d++){
      // una sola acción por sol (CFG.PICKS_PER_SOL)
      for (let p = 0; p < CFG.PICKS_PER_SOL; p++){
        const id = strategy(g);
        if (id && g.decisions.canDo(id)) g.decisions.do(id);
      }
      g.nextSol();
    }
    return g;
  }
  // estrategia prudente (una acción por sol): oxígeno primero, luego el escudo que pide la tormenta anunciada
  const careful = g => {
    const s = g.stats, f = g.forecast;
    if (s.oxygen < 40) return 'recycler';
    if (f && f.roll.type === 'radiation' && g.projectedShield(f.target) < SpaceWeather.need(f.roll.ev) + 5) return 'shieldUp';
    if (s.food < 25) return 'crops';
    if (s.shield < 45) return 'shieldUp';
    if (s.oxygen < 60) return 'recycler';
    if (s.food < 55) return 'crops';
    return null;
  };
  const careless = g => g.stats.oxygen < 55 ? 'recycler' : null;

  for (const [id, a] of Object.entries(ACTIONS)){
    const c = costOf(a);
    console.assert(c.power > 0 || c.o2 > 0, id + ' must cost something');
  }

  // deshacer restaura el estado exacto
  const u = new Game();
  const p0 = u.stats.power, o0 = u.stats.oxygen, pl0 = u.decisions.picksLeft, h0 = u.log.length;
  u.decisions.do('recycler');
  u.decisions.undo('recycler');
  console.assert(u.stats.power === p0 && u.stats.oxygen === o0 &&
                 u.decisions.picksLeft === pl0 && u.log.length === h0, 'undo must restore the previous state');

  // límite de acciones: con PICKS_PER_SOL = 1, una segunda acción en el mismo sol no se permite
  const lim = new Game();
  lim.decisions.do('recycler');
  console.assert(lim.decisions.do('recycler') === false || CFG.PICKS_PER_SOL > 1,
                 'solo se permite una acción por sol');

  // regresión del bug: plantar no suma comida; la cosecha sí, y solo al madurar
  const noRand = () => 0.99;   // sin tormentas solares: solo tormentas de arena
  const f = new Game(noRand);
  const f0 = f.stats.food;
  f.decisions.do('crops');
  console.assert(f.stats.food === f0, 'plantar no debe sumar comida');
  for (let i = 0; i < 3; i++) f.nextSol();
  console.assert(f.decisions.growing.length === 1, 'el cultivo sigue en marcha antes de madurar');
  f.nextSol();
  console.assert(f.decisions.growing.length === 0, 'el cultivo debe cosecharse al madurar');
  console.assert(f.log.entries.some(e => e.key === 'log.cropsDone'), 'la cosecha debe registrarse en el log');

  // tormenta de arena: dura entre DUST_MIN y DUST_MAX noches, y salen todas las duraciones
  {
    const seen = new Set();
    for (let i = 0; i < 400; i++){
      const dz = new SpaceWeather(Math.random);
      dz.startDust();
      let nights = 0;
      while (dz.dusty && nights < 20){ dz.tickDust(); nights++; }
      console.assert(nights >= SpaceWeather.CFG.DUST_MIN && nights <= SpaceWeather.CFG.DUST_MAX, 'duración fuera de rango: ' + nights);
      seen.add(nights);
    }
    console.assert(seen.size === SpaceWeather.CFG.DUST_MAX - SpaceWeather.CFG.DUST_MIN + 1, 'deben salir todas las duraciones');
  }

  // jamás hay aviso ni sorteo de polvo mientras hay una tormenta de arena en curso (ni aunque termine antes del evento)
  {
    let bad = 0;
    for (let i = 0; i < 300; i++){
      const gm = new Game(Math.random);
      for (let d = 0; d < 40 && !gm.over; d++){
        if (gm.weather.dusty && gm.forecast && gm.forecast.roll.type === 'dust') bad++;
        gm.nextSol();
      }
    }
    console.assert(bad === 0, 'hubo ' + bad + ' avisos de polvo durante una tormenta de arena');
  }

  // el impacto siempre devuelve un escudo perdido numérico (antes faltaba y el escudo se volvía NaN)
  for (const sh of [0, 20, 50, 100]) for (const sev of [2, 5, 9, 10]){
    const im = SpaceWeather.impact(sh, { severity: sev });
    console.assert(im.absorbed ? Number.isFinite(im.shieldLoss) : im.lethal === true, 'absorbida: pérdida numérica; si no, mortal');
    console.assert(im.absorbed === (sh >= SpaceWeather.need({ severity: sev })), 'absorbed coherente con need');
  }

  // aviso: aparece 2 soles antes, no vuelve a abrirse, y el evento anunciado es el que se aplica
  const pr = new Game(() => 0.1);   // 0.1 < STORM: tormenta solar
  console.assert(pr.forecast === null && pr.forecastOpen === false, 'sin aviso en el sol 1 (faltan 4 soles)');
  pr.nextSol();                     // sol 2: faltan 3 soles para la noche 5 (aún fuera de FORECAST_AHEAD)
  pr.nextSol();                     // sol 3: faltan 2 soles para la noche 5
  console.assert(pr.sol === 3 && pr.forecast && pr.forecast.target === 5, 'el aviso debe prepararse para la noche 5');
  console.assert(pr.forecastOpen === true, 'el aviso debe abrirse en el sol 3');
  console.assert(pr.forecast.target - pr.sol === 2, 'la cuenta atrás debe ser de 2 soles');
  const pev = pr.forecast.roll.ev;
  pr.forecastOpen = false;          // el jugador cierra el aviso
  pr.nextSol();                     // sol 4
  console.assert(pr.forecastOpen === false, 'el aviso no debe reabrirse en el sol 4');
  pr.nextSol();                     // pasa al sol 5 (la cuenta atrás marca "esta noche")
  console.assert(pr.forecast && pr.forecast.target === pr.sol, 'el sol 5 sigue mostrando el aviso: "esta noche"');
  pr.nextSol();                     // termina el sol 5: se aplica el evento
  console.assert(pr.forecast === null, 'tras el evento no debe quedar aviso pendiente');
  console.assert(pr.log.entries.some(e => e.vars && e.vars.ev === pev), 'debe aplicarse exactamente el evento anunciado');

  // configuración coherente: un evento no puede empezar mientras el anterior sigue activo o avisado
  console.assert(SpaceWeather.CFG.EVERY > FORECAST_AHEAD, 'EVERY debe ser mayor que FORECAST_AHEAD');

  // nunca dos avisos a la vez, aunque el aviso sea muy anticipado y los eventos muy seguidos
  {
    const oldEvery = SpaceWeather.CFG.EVERY;
    SpaceWeather.CFG.EVERY = 2;
    const ov = new Game(() => 0.1);
    let targets = [];
    for (let i = 0; i < 12 && !ov.over; i++){
      if (ov.forecast) targets.push(ov.forecast.target);
      console.assert(!ov.forecast || ov.forecast.target >= ov.sol, 'un aviso nunca debe quedar en el pasado');
      ov.nextSol();
    }
    console.assert(targets.every(t => t % 2 === 0), 'los avisos deben coincidir con soles de evento');
    SpaceWeather.CFG.EVERY = oldEvery;
  }

  // sin polvo sobre polvo: con polvo activo siempre sale tormenta solar
  const nd = new Game(() => 0.99);   // 0.99 = siempre pediría polvo
  nd.weather.startDust();
  console.assert(nd.weather.draw({ noDust: true }).type === 'radiation', 'con polvo activo no debe sortearse otro polvo');
  nd.weather.startDust(); nd.weather.startDust();
  console.assert(nd.weather.dustLeft <= SpaceWeather.CFG.DUST_MAX, 'el polvo no se acumula');

  // el escudo proyectado descuenta todas las noches hasta el evento (incluida la del evento)
  const pj = new Game(() => 0.1);
  pj.nextSol(); pj.nextSol();   // sol 3: aviso para la noche 5 (3 noches: 3, 4 y 5)
  console.assert(pj.projectedShield(5) === Math.max(0, Math.round(pj.stats.shield - 3 * CFG.SHIELD_DECAY)),
                 'la proyección debe descontar 3 noches');

  // el mazo no repite la misma tormenta dos veces seguidas
  const sw = new SpaceWeather(Math.random);
  let prev = null, rep = false;
  for (let i = 0; i < 200; i++){ const e = sw.draw({ noDust: true }).ev; if (e === prev) rep = true; prev = e; }
  console.assert(!rep, 'no debe repetirse el mismo evento seguido');

  // cualquier barra en 0 al terminar la noche = derrota inmediata (incluida la comida)
  const lethal = {
    oxygen: ['log.failO2', g => { g.stats.oxygen = CFG.O2_DRAIN; }],
    shield: ['log.failShield', g => { g.stats.shield = CFG.SHIELD_DECAY; }],
    food:   ['log.failFood', g => { g.stats.food = CFG.FOOD_DRAIN; }],
  };
  for (const [k, [key, setup]] of Object.entries(lethal)){
    const z = new Game(() => 0.99);
    setup(z);
    z.nextSol();
    console.assert(z.over && !z.won && z.log.first.key === key, k + ' en 0 debe terminar la misión de inmediato');
  }

  // no se puede ganar con una barra en 0 en el último sol
  const lw = new Game(() => 0.99);
  lw.sol = CFG.WIN_SOL;
  lw.stats.food = CFG.FOOD_DRAIN;
  lw.nextSol();
  console.assert(lw.over && !lw.won, 'no se gana con la comida en 0');

  // tormenta solar: afecta SOLO al escudo; quita según su severidad y, sin escudo suficiente, mata
  {
    const weak = { severity: 5 }, strong = { severity: 10 };
    console.assert(SpaceWeather.need(strong) > SpaceWeather.need(weak), 'más severidad, más escudo');
    console.assert(SpaceWeather.need(strong) === 60, 'severidad 10 quita 60');

    const ev0 = { severity: 9, date: 'x', label: 'x', note: 'x' };   // quita 54
    const ok = new Game(() => 0.99);
    ok.stats.shield = 100;
    const p0 = ok.stats.power, o0 = ok.stats.oxygen, f0 = ok.stats.food;
    ok._radiation(ev0);
    console.assert(!ok.radiationKill && ok.stats.shield === 100 - SpaceWeather.need(ev0), 'escudo suficiente: absorbe y pierde la cantidad según severidad');
    console.assert(ok.stats.power === p0 && ok.stats.oxygen === o0 && ok.stats.food === f0 && !ok.weather.dusty, 'la tormenta solar solo toca el escudo');

    const bad = new Game(() => 0.99);
    bad.stats.shield = SpaceWeather.need(ev0) - 1;   // falta solo 1 punto: también es mortal
    const o2 = bad.stats.oxygen, food = bad.stats.food;
    bad._radiation(ev0);
    console.assert(bad.radiationKill && bad.stats.oxygen === o2 && bad.stats.food === food, 'escudo insuficiente: radiación mortal, sin tocar oxígeno ni comida');
    console.assert(bad._deadReason() === 'log.failRadiation', 'la causa de derrota debe ser la radiación');
  }

  // la duración avisada es exactamente la que dura la tormenta
  for (let i = 0; i < 100; i++){
    const w = new SpaceWeather(Math.random), r = w.draw({ noDust: false });
    if (r.type !== 'dust') continue;
    w.startDust(r.level, r.days);
    let n = 0; while (w.dusty){ w.tickDust(); n++; }
    console.assert(n === r.days && r.days >= SpaceWeather.CFG.DUST_MIN && r.days <= SpaceWeather.CFG.DUST_MAX, 'la duración avisada debe cumplirse');
  }

  // tormenta de arena: afecta SOLO a la energía; la recarga depende de su intensidad y salen las tres
  {
    const C = SpaceWeather.CFG;
    const lv = new Set();
    for (let i = 0; i < 400; i++){ const r = SpaceWeather.pickDustLevel(Math.random()); lv.add(r.id); }
    console.assert(lv.size === C.DUST_LEVELS.length, 'deben salir todas las intensidades de arena');
    for (const level of C.DUST_LEVELS){
      const dg = new Game(() => 0.99);
      dg.weather.startDust(level);
      dg.stats.power = 20; dg.stats.food = 90; dg.stats.oxygen = 90; dg.stats.shield = 90; dg.forecast = null;
      const sh0 = dg.stats.shield;
      dg.nextSol();
      console.assert(dg.stats.power - 20 === level.income, 'recarga con arena ' + level.id + ': ' + (dg.stats.power - 20));
      console.assert(level.income < CFG.INCOME, 'la arena siempre reduce la recarga');
      console.assert(dg.stats.shield === sh0 - CFG.SHIELD_DECAY, 'la arena no toca el escudo');
    }
  }

  let wins = 0, aMax = 0, bMax = 0, aFood = 0, bFood = 0, bWins = 0;
  const N = 100;
  for (let i = 0; i < N; i++){
    const a = simulate(careful), b = simulate(careless);
    aMax += a.stats.maxO2; bMax += b.stats.maxO2;
    aFood += a.stats.food; bFood += b.stats.food;
    if (a.won) wins++;
    if (b.won) bWins++;
  }
  console.assert(wins / N >= 0.6, 'careful play should win most runs (' + wins + '/' + N + ')');
  console.assert(bWins / N < 0.3, 'no-food no-shield strategy should fail most runs (' + bWins + '/' + N + ')');
  console.assert(aFood / N > bFood / N, 'planting should keep food higher than not planting');

  const g = new Game();
  const ids = Object.keys(ACTIONS);
  for (let i = 0; i < 200 && !g.over; i++){
    const ok = ids.filter(id => g.decisions.canDo(id));
    if (ok.length) g.decisions.do(ok[(Math.random() * ok.length) | 0]);
    else g.nextSol();
  }
  const st = g.stats;
  console.assert([st.power, st.oxygen, st.shield, st.food, st.maxO2].every(Number.isFinite), 'no NaN under random play');

  console.log('Self-tests: careful won ' + wins + '/' + N + ' (avg maxO2 ' + Math.round(aMax / N) +
              ', avg food ' + Math.round(aFood / N) + ') | careless won ' + bWins + '/' + N +
              ' | undo ok | crops ok | dust 3-6 sols ok | warning ok | random ok');
}

if (typeof module !== 'undefined') module.exports = { Game, ACTIONS, CFG };