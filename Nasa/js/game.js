/* game.js — Log (bitácora) y Game (orquesta cada sol y la UI).
   Stats y Decisions: stats-decisions.js. Clima: events.js. Textos: lang.js. Datos: data.js. */

/* En node los módulos no comparten ámbito global: se exponen como globales
   para usar los mismos nombres que en el navegador. */
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
    this.starving = false;
    this.warned = { shield: false, power: false };
    this.alertKey = '';
    this.stats = new Stats(CFG.START);
    this.log = new Log();
    this.decisions = new Decisions(this);
    this.weather = new SpaceWeather(rng);
    this.log.push('log.intro', { n: CFG.WIN_SOL });
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
    this._warnLow();

    const s = this.stats;
    // comprobación de supervivencia al anochecer
    if (s.shield <= 0) return this._fail('log.failShield');
    if (s.power <= 0)  return this._fail('log.failPower');
    if (s.oxygen <= 0) return this._fail('log.failO2');
    if (s.food <= 0){
      if (this.starving) return this._fail('log.failFood');
      this.starving = true;   // 1 sol de gracia
      this.log.push('log.noFood');
    } else {
      this.starving = false;
    }

    // pasa la noche
    s.add('power', this.weather.dusty ? CFG.DUST_INCOME : CFG.INCOME);
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

    // evento climático programado
    if (this.weather.isEventDay(this.sol)){
      this._applyWeather(this.weather.roll());
    }

    if (this.sol >= CFG.WIN_SOL){ this.over = true; this.won = true; }
    else this.sol++;
  }

  score(){
    return Math.round(this.stats.oxygen + this.stats.food + this.stats.shield);
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

  _applyWeather(r){
    if (r.type === 'radiation') this._radiation(r.ev);
    else if (r.type === 'dust'){
      this.alertKey = 'alert.dust';
      this.log.push('log.dustStart');
    } else {
      this.log.push('log.quiet');
    }
  }

  _radiation(ev){
    const s = this.stats;
    const imp = SpaceWeather.impact(s.shield, ev);
    if (imp.absorbed){
      s.add('shield', -imp.shieldLoss);
      this.alertKey = 'alert.absorbed';
      this.log.push('log.absorbed', { date: ev.date, hit: imp.shieldLoss, ev });
    } else {
      s.maxO2 = Math.max(CFG.MIN_O2_GEAR, s.maxO2 - imp.o2Hit);
      s.capOxygen();
      s.add('oxygen', -imp.o2Hit);
      s.shield = 0;
      this.alertKey = 'alert.storm';
      const lost = this.decisions.loseCrops();
      this.log.push('log.stormHit', { date: ev.date, max: s.maxO2, o2: imp.o2Hit, ev });
      if (lost) this.log.push('log.cropsLost');
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

  function renderMsg(m){
    const v = m.vars || {};
    if (m.key === 'log.act') return t('log.act', { name: t('act.' + v.id + '.name'), hint: t('act.' + v.id + '.hint') });
    if (m.key === 'log.absorbed' || m.key === 'log.stormHit'){
      const ev = v.ev;
      return t(m.key, { date: ev.date, label: L(ev, 'label'), note: L(ev, 'note'), hit: v.hit, max: v.max, o2: v.o2 });
    }
    return t(m.key, v);
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

    const growing = d.growing;
    const due = growing.length ? Math.min(...growing.map(c => c.due)) : 0;
    $('#crops').textContent = growing.length
      ? t('cropsLine', { n: growing.length, d: Math.max(1, due - game.sol) }) : '';
    $('#alert').textContent = game.alertKey ? t(game.alertKey) : '';
    $('#picks').textContent = t('picks', { n: d.picksLeft });
    $('#nextSol').textContent = t('endSol');

    const active = d.active();
    document.querySelectorAll('#btns button').forEach(b => {
      const id = b.dataset.act;
      b.classList.toggle('active', active.has(id));
      b.disabled = !d.canDo(id) && !active.has(id);   // una acción activa siempre se puede cancelar
    });

    $('#log').innerHTML = game.log.entries.map(m => '<li>' + renderMsg(m) + '</li>').join('');
    drawScene();
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

  function renderReal(){
    const rb = $('#realBody');
    rb.innerHTML = '';
    $('#real summary').textContent = t('whatsReal');
    const add = (tag, html) => { const e = document.createElement(tag); e.innerHTML = html; rb.appendChild(e); return e; };
    add('p', t('real.stormsIntro'));
    const ul = add('ul', '');
    DONKI_EVENTS.forEach(ev => {
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
    render();
  };

  setLang(LANG);

} else if (typeof module !== 'undefined' && require.main === module) {
  /* ---------- pruebas en node: node js/game.js ---------- */
  function simulate(strategy){
    const g = new Game();
    for (let d = 0; d < 60 && !g.over; d++){
      for (let p = 0; p < 2; p++){
        const id = strategy(g);
        if (id && g.decisions.canDo(id)) g.decisions.do(id);
      }
      g.nextSol();
    }
    return g;
  }
  const careful = g => {
    const s = g.stats;
    return s.shield < 70 ? 'shieldUp' : s.food < 55 ? 'crops' : s.oxygen < 60 ? 'recycler' : s.power >= 40 ? 'crops' : s.oxygen < 85 ? 'recycler' : null;
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

  // regresión del bug: plantar no suma comida; la cosecha sí, y solo al madurar
  const noRand = () => 0.99;   // sin tormentas ni polvo: resultado determinista
  const f = new Game(noRand);
  const f0 = f.stats.food;
  f.decisions.do('crops');
  console.assert(f.stats.food === f0, 'plantar no debe sumar comida');
  for (let i = 0; i < 3; i++) f.nextSol();
  console.assert(f.decisions.growing.length === 1, 'el cultivo sigue en marcha antes de madurar');
  f.nextSol();
  console.assert(f.decisions.growing.length === 0, 'el cultivo debe cosecharse al madurar');
  console.assert(f.log.entries.some(e => e.key === 'log.cropsDone'), 'la cosecha debe registrarse en el log');

  let wins = 0, aMax = 0, bMax = 0, aFood = 0, bFood = 0, bWins = 0;
  const N = 100;
  for (let i = 0; i < N; i++){
    const a = simulate(careful), b = simulate(careless);
    aMax += a.stats.maxO2; bMax += b.stats.maxO2;
    aFood += a.stats.food; bFood += b.stats.food;
    if (a.won) wins++;
    if (b.won) bWins++;
  }
  console.assert(wins / N >= 0.7, 'careful play should win most runs (' + wins + '/' + N + ')');
  console.assert(bWins / N < 0.3, 'no-food no-shield strategy should fail most runs (' + bWins + '/' + N + ')');
  console.assert(aFood / N > bFood / N, 'planting should keep food higher than not planting');
  console.assert(aMax / N > bMax / N, 'shielding should keep gear healthier than not shielding');

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
              ' | undo ok | crops ok | random ok');
}

if (typeof module !== 'undefined') module.exports = { Game, ACTIONS, CFG };