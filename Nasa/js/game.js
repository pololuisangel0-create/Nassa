/* Junior Astronaut Mission Trainer — retro Mars outpost prototype.
   The Engine below is DOM-free so it can be smoke-tested with node (node js/game.js).
   4 bars: POWER · OXYGEN · SHIELD · FOOD. Any bar at 0 when you end a sol = mission
   fails, except FOOD which gives you 1 sol of grace. Unshielded solar storms damage
   the oxygen gear permanently and destroy growing crops.
   UI strings live in js/i18n.js; log entries are stored as {key, vars} pairs. */
const DATA = (typeof module !== 'undefined')
  ? require('./data.js')
  : { DONKI_EVENTS, RADLAB, REAL_FACTS };

const CFG = {
  WIN_SOL: 30,
  START: { power: 50, oxygen: 80, shield: 60, food: 60, maxO2: 100 },
  INCOME: 14, DUST_INCOME: 3,
  O2_DRAIN: 3, FOOD_DRAIN: 3, SHIELD_DECAY: 2, MIN_O2_GEAR: 30,
  EVENTS: { EVERY: 4, STORM: 0.45, DUST: 0.25, DUST_LEN: 2 },
  ABSORB: 8, SHIELD_HIT: 4,   // storm absorbed if shield >= severity*ABSORB
  WARN_LOW: 10,               // "almost empty" warning threshold
};

const ACTIONS = {
  recycler: { o2:30,  power:-12 },
  shieldUp: { shield:30, power:-20 },
  crops:    { food:25, power:-12, o2:-6, delay:3 },   // harvest arrives after 3 sols
};

const clamp = v => Math.max(0, Math.min(100, v));
function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
function log(st,key,vars){ st.history.unshift({ key, vars: vars||{} }); if (st.history.length>40) st.history.pop(); }
function costOf(a){ return { power:Math.max(0, -(a.power||0)), o2:Math.max(0, -(a.o2||0)) }; }

const Engine = {
  newGame(){
    const st = {
      sol:1, picksLeft:2, dust:0, over:false, won:false,
      starving:false, warnShield:false, warnPower:false,
      pending:[], history:[], undo:[], alertKey:'',
      deck:shuffle(DATA.DONKI_EVENTS.slice()),
      ...CFG.START,
    };
    log(st,'log.intro',{ n: CFG.WIN_SOL });
    return st;
  },

  canDo(st,id){
    if (st.over || st.picksLeft<=0) return false;
    const a = ACTIONS[id]; if (!a) return false;
    const c = costOf(a);
    return st.power >= c.power && st.oxygen >= c.o2 + CFG.O2_DRAIN; // keep one sol of air in reserve
  },

  doAction(st,id){
    if (!this.canDo(st,id)) return false;
    // snapshot (before the change) so the player can cancel this action later
    st.undo.push({
      id, power:st.power, oxygen:st.oxygen, shield:st.shield, food:st.food,
      maxO2:st.maxO2, picksLeft:st.picksLeft,
      pending: st.pending.map(p => ({ ...p })), histLen: st.history.length,
    });
    const a = ACTIONS[id];
    st.power  = clamp(st.power  + (a.power ||0));
    st.oxygen = clamp(Math.min(st.oxygen, st.maxO2) + (a.o2||0));
    st.shield = clamp(st.shield + (a.shield||0));
    st.food   = clamp(st.food   + (a.food  ||0));
    if (a.delay) st.pending.push({ due: st.sol + a.delay, pts: a.food });
    st.picksLeft--;
    log(st,'log.act',{ id });
    return true;
  },

  // cancel an action: undoes back to (and including) the most recent use of `id`
  undoAction(st,id){
    for (let i = st.undo.length-1; i >= 0; i--){
      if (st.undo[i].id === id){
        const s = st.undo[i];
        st.power = s.power; st.oxygen = s.oxygen; st.shield = s.shield;
        st.food = s.food; st.maxO2 = s.maxO2; st.picksLeft = s.picksLeft;
        st.pending = s.pending;
        st.history = st.history.slice(st.history.length - s.histLen);
        st.undo = st.undo.slice(0, i);   // later actions depended on this one
        return true;
      }
    }
    return false;
  },

  activeActions(st){ return new Set(st.undo.map(e => e.id)); },

  nextSol(st){
    if (st.over) return;
    st.undo = [];
    st.picksLeft = 2;
    st.alertKey = '';

    // "almost empty" warnings (once per low episode, cleared when it recovers)
    if (st.shield > CFG.WARN_LOW) st.warnShield = false;
    if (st.power  > CFG.WARN_LOW) st.warnPower  = false;
    if (st.shield <= CFG.WARN_LOW && st.shield > 0 && !st.warnShield){ st.warnShield = true; log(st,'log.lowShield'); }
    if (st.power  <= CFG.WARN_LOW && st.power  > 0 && !st.warnPower ){ st.warnPower  = true; log(st,'log.lowPower'); }

    // end-of-turn survival check: no system may be dead at nightfall
    if (st.shield <= 0){ st.over = true; log(st,'log.failShield'); return; }
    if (st.power  <= 0){ st.over = true; log(st,'log.failPower'); return; }
    if (st.oxygen <= 0){ st.over = true; log(st,'log.failO2'); return; }
    if (st.food <= 0){
      if (st.starving){ st.over = true; log(st,'log.failFood'); return; }
      st.starving = true;   // 1 sol of grace: fix it before the next nightfall
      log(st,'log.noFood');
    } else st.starving = false;

    // the night passes
    st.power  = clamp(st.power  + (st.dust>0 ? CFG.DUST_INCOME : CFG.INCOME));
    st.oxygen = clamp(Math.min(st.oxygen, st.maxO2) - CFG.O2_DRAIN);
    st.shield = clamp(st.shield - CFG.SHIELD_DECAY);
    st.food   = clamp(st.food   - CFG.FOOD_DRAIN);   // the crew eats every sol
    if (st.dust>0 && --st.dust===0) log(st,'log.dustEnd');

    // harvests that ripened overnight
    st.pending = st.pending.filter(p => {
      if (p.due === st.sol){
        st.food = clamp(st.food + p.pts);
        log(st,'log.cropsDone',{ n: p.pts });
        return false;
      }
      return true;
    });

    // scheduled space-weather event (real NASA DONKI records)
    if (st.sol % CFG.EVENTS.EVERY === 0){
      const r = Math.random();
      if (r < CFG.EVENTS.STORM && st.deck.length){
        this.radiation(st, st.deck.pop());
      } else if (r < CFG.EVENTS.STORM + CFG.EVENTS.DUST){
        st.dust = CFG.EVENTS.DUST_LEN;
        st.alertKey = 'alert.dust';
        log(st,'log.dustStart');
      } else {
        log(st,'log.quiet');
      }
      if (!st.deck.length) st.deck = shuffle(DATA.DONKI_EVENTS.slice());
    }

    if (st.sol >= CFG.WIN_SOL){ st.over = true; st.won = true; }
    else st.sol++;
  },

  radiation(st,ev){
    const S = ev.severity, before = st.shield, need = S * CFG.ABSORB;
    if (before >= need){
      st.shield = clamp(before - S*CFG.SHIELD_HIT);
      st.alertKey = 'alert.absorbed';
      log(st,'log.absorbed',{ date: ev.date, hit: S*CFG.SHIELD_HIT, ev });
    } else {
      // unshielded: the blast damages the oxygen gear permanently and kills crops
      const o2Hit = Math.max(S*4, Math.floor((need - before) * 0.6));
      st.maxO2 = Math.max(CFG.MIN_O2_GEAR, st.maxO2 - o2Hit);
      st.oxygen = clamp(Math.min(st.oxygen, st.maxO2) - o2Hit);
      st.shield = 0;
      st.alertKey = 'alert.storm';
      const hadCrops = st.pending.length > 0;
      st.pending = [];
      log(st,'log.stormHit',{ date: ev.date, max: st.maxO2, o2: o2Hit, ev });
      if (hadCrops) log(st,'log.cropsLost');
    }
  },

  score(st){ return Math.round(st.oxygen + st.food + st.shield); },
};

/* ---------- browser UI (skipped under node) ---------- */
if (typeof document !== 'undefined') {
  const $ = s => document.querySelector(s);
  let st = Engine.newGame();

  const sprites = {};
  ['sun','flare','hab','solar','rover'].forEach(k => {
    const i = new Image();
    i.onload = () => { i.ok = true; drawScene(); };
    i.onerror = () => { i.bad = true; };
    i.src = 'assets/sprites/'+k+'.svg';
    sprites[k] = i;
  });

  const cv = $('#scene'), ctx = cv.getContext('2d');

  function drawSprite(k,x,y,s){
    const i = sprites[k];
    if (i && i.ok) ctx.drawImage(i, x, y, 16*s, 16*s);
    else { ctx.fillStyle = '#777'; ctx.fillRect(x, y, 16*s, 16*s); }
  }

  function drawScene(){
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle='#a4552e'; ctx.fillRect(0,0,320,50);
    ctx.fillStyle='#c06a3a'; ctx.fillRect(0,50,320,50);
    ctx.fillStyle='#d97f46'; ctx.fillRect(0,100,320,40);
    ctx.fillStyle='#8a3f22'; ctx.fillRect(0,140,320,40);
    ctx.fillStyle='#a05028'; ctx.fillRect(0,140,320,5);

    const storm = st.alertKey==='alert.storm' || st.alertKey==='alert.absorbed';
    drawSprite(storm ? 'flare' : 'sun', 244, 12, 4);
    drawSprite('hab',   36, 104, 4);
    drawSprite('solar', 128, 96, 4);
    drawSprite('rover', 216, 96, 4);

    if (st.dust > 0){
      ctx.fillStyle='rgba(200,110,50,0.45)';
      [18,63,108].forEach(y => ctx.fillRect(0,y,320,12));
      ctx.fillStyle='rgba(190,100,40,0.15)'; ctx.fillRect(0,0,320,140);
    }
    if (storm){ ctx.fillStyle='rgba(255,70,50,0.16)'; ctx.fillRect(0,0,320,180); }
  }

  // translate one history entry to HTML text
  function renderMsg(m){
    const v = m.vars || {};
    if (m.key === 'log.act') return t('log.act',{ name:t('act.'+v.id+'.name'), hint:t('act.'+v.id+'.hint') });
    if (m.key === 'log.absorbed' || m.key === 'log.stormHit'){
      const ev = v.ev;
      return t(m.key,{ date:ev.date, label:L(ev,'label'), note:L(ev,'note'), hit:v.hit, max:v.max, o2:v.o2 });
    }
    return t(m.key, v);
  }

  function render(){
    $('#gameTitle').textContent = t('title');
    $('#solLine').textContent = t('sol',{ n:st.sol, total:CFG.WIN_SOL }) + (st.dust>0 ? t('dust') : '');
    ['power','oxygen','shield','food'].forEach(k => {
      const bar = document.querySelector('.bar[data-k="'+k+'"]');
      bar.querySelector('label').textContent = t(k);
      bar.querySelector('.fill').style.width = st[k]+'%';
      bar.querySelector('.val').textContent = Math.round(st[k]);
    });
    const cap = document.querySelector('.cap');
    if (cap) cap.style.left = st.maxO2+'%';
    const due = st.pending.length ? Math.min(...st.pending.map(p => p.due)) : 0;
    $('#crops').textContent = st.pending.length
      ? t('cropsLine',{ n: st.pending.length, d: Math.max(1, due - st.sol) }) : '';
    $('#alert').textContent = st.alertKey ? t(st.alertKey) : '';
    $('#picks').textContent = t('picks',{ n:st.picksLeft });
    $('#nextSol').textContent = t('endSol');
    const active = Engine.activeActions(st);
    document.querySelectorAll('#btns button').forEach(b => {
      const id = b.dataset.act;
      b.classList.toggle('active', active.has(id));
      b.disabled = !Engine.canDo(st,id) && !active.has(id);  // an active action can always be cancelled
    });
    $('#log').innerHTML = st.history.map(m => '<li>'+renderMsg(m)+'</li>').join('');
    drawScene();
    if (st.over) showEnd();
  }

  function showEnd(){
    const title = $('#endTitle');
    title.textContent = t(st.won ? 'end.win' : 'end.lose');
    title.className = st.won ? 'success' : 'failed';
    $('#endStats').textContent =
      t('end.sols',{ n: st.won ? CFG.WIN_SOL : st.sol-1 })+'\n'+
      t('end.o2',{ n: Math.round(st.oxygen), max: st.maxO2 })+'\n'+
      t('end.food',{ n: Math.round(st.food) })+'\n'+
      t('end.score',{ n: Engine.score(st) });
    $('#endLearn').textContent = st.won
      ? t('end.winLearn')
      : t('end.lastLog') + renderMsg(st.history[0]);
    $('#endScreen').hidden = false;
  }

  // action buttons (labels refreshed on language change)
  const btns = $('#btns');
  for (const id of Object.keys(ACTIONS)){
    const b = document.createElement('button');
    b.dataset.act = id;
    b.onclick = () => {
      if (Engine.activeActions(st).has(id)) Engine.undoAction(st,id);  // click again = cancel
      else Engine.doAction(st,id);
      render();
    };
    btns.appendChild(b);
  }
  function buildActionLabels(){
    document.querySelectorAll('#btns button').forEach(b => {
      const id = b.dataset.act;
      b.textContent = t('act.'+id+'.name');
      let small = b.querySelector('small');
      if (!small){ small = document.createElement('small'); b.appendChild(small); }
      small.textContent = t('act.'+id+'.hint');
    });
  }

  // "What's real?" panel — attribution required by the challenge brief
  function renderReal(){
    const rb = $('#realBody');
    rb.innerHTML = '';
    $('#real summary').textContent = t('whatsReal');
    const add = (tag,html) => { const e = document.createElement(tag); e.innerHTML = html; rb.appendChild(e); };
    add('p', t('real.stormsIntro'));
    const ul = add('ul','');
    DATA.DONKI_EVENTS.forEach(ev => {
      const li = document.createElement('li');
      li.textContent = ev.date+' — '+L(ev,'label')+': '+L(ev,'note');
      ul.appendChild(li);
    });
    add('p', t('real.radlab',{ instrument: DATA.RADLAB.instrument, rate: DATA.RADLAB.absorbed_dose_rate_uGy_per_h, note: L(DATA.RADLAB,'note') }));
    add('p', L(DATA.REAL_FACTS,'dust'));
    add('p', L(DATA.REAL_FACTS,'comm'));
  }

  // language toggle (default English, persists in localStorage)
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

  $('#nextSol').onclick = () => { Engine.nextSol(st); render(); };
  $('#restart').onclick = () => {
    st = Engine.newGame();
    $('#endScreen').hidden = true;
    render();
  };

  setLang(LANG);
} else if (typeof module !== 'undefined' && require.main === module) {
  // node smoke tests
  function simulate(strategy){
    const s = Engine.newGame();
    for (let d=0; d<60 && !s.over; d++){
      for (let p=0; p<2; p++){ const id = strategy(s); if (id && Engine.canDo(s,id)) Engine.doAction(s,id); }
      Engine.nextSol(s);
    }
    return s;
  }
  const careful = s => s.shield < 70 ? 'shieldUp' : s.food < 55 ? 'crops' : s.oxygen < 60 ? 'recycler' : s.power >= 40 ? 'crops' : s.oxygen < 85 ? 'recycler' : null;
  const careless = s => s.oxygen < 55 ? 'recycler' : null;   // never shields, never plants

  for (const [id,a] of Object.entries(ACTIONS)){
    const c = costOf(a);
    console.assert(c.power>0 || c.o2>0, id+' must cost something (no free choices)');
  }

  // cancel feature: undo restores the exact previous state
  const u = Engine.newGame();
  const p0 = u.power, o0 = u.oxygen, pl0 = u.picksLeft, h0 = u.history.length;
  Engine.doAction(u,'recycler');
  Engine.undoAction(u,'recycler');
  console.assert(u.power===p0 && u.oxygen===o0 && u.picksLeft===pl0 && u.history.length===h0, 'undo must restore the previous state');

  let wins = 0, aMax = 0, bMax = 0, aFood = 0, bFood = 0, bWins = 0, N = 100;
  for (let i = 0; i < N; i++){
    const a = simulate(careful), b = simulate(careless);
    aMax += a.maxO2; bMax += b.maxO2; aFood += a.food; bFood += b.food;
    if (a.won) wins++;
    if (b.won) bWins++;
  }
  console.assert(wins / N >= 0.7, 'careful play should win most runs (' + wins + '/' + N + ')');
  console.assert(bWins / N < 0.3, 'no-food no-shield strategy should fail most runs (' + bWins + '/' + N + ')');
  console.assert(aFood / N > bFood / N, 'planting should keep food higher than not planting');
  console.assert(aMax / N > bMax / N, 'shielding should keep gear healthier than not shielding');

  const s = Engine.newGame();
  const ids = Object.keys(ACTIONS);
  for (let i=0; i<200 && !s.over; i++){
    const ok = ids.filter(id => Engine.canDo(s,id));
    if (ok.length) Engine.doAction(s, ok[(Math.random()*ok.length)|0]);
    else Engine.nextSol(s);
  }
  console.assert([s.power,s.oxygen,s.shield,s.food,s.maxO2].every(Number.isFinite), 'no NaN under random play');

  console.log('Self-tests: careful won ' + wins + '/' + N + ' (avg maxO2 ' + Math.round(aMax/N) + ', avg food ' + Math.round(aFood/N) +
              ') | careless won ' + bWins + '/' + N + ' (avg food ' + Math.round(bFood/N) + ') | undo ok | random ok');
}

if (typeof module !== 'undefined') module.exports = { Engine, ACTIONS, CFG };
