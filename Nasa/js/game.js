/* Junior Astronaut Mission Trainer — retro Mars outpost prototype.
   The Engine below is DOM-free so it can be smoke-tested with node (node js/game.js).
   Lose by: oxygen 0 · two dark nights (power 0) · storm-damaged oxygen gear.
   UI strings live in js/i18n.js; log entries are stored as {key, vars} pairs. */
const DATA = (typeof module !== 'undefined')
  ? require('./data.js')
  : { DONKI_EVENTS, RADLAB, REAL_FACTS };

const CFG = {
  WIN_SOL: 30,
  START: { power: 50, oxygen: 80, shield: 60, science: 0, maxO2: 100 },
  INCOME: 14, DUST_INCOME: 3,
  O2_DRAIN: 3, NO_POWER_DRAIN: 4, SHIELD_DECAY: 2, MIN_O2_GEAR: 30,
  EVENTS: { EVERY: 4, STORM: 0.45, DUST: 0.25, DUST_LEN: 2 },
  ABSORB: 8, SHIELD_HIT: 4,   // storm absorbed if shield >= severity*ABSORB
};

const ACTIONS = {
  recycler: { o2:30,  power:-12 },
  shieldUp: { shield:30, power:-20 },
  science:  { science:15, power:-10, o2:-6, delay:2 },
};

const clamp = v => Math.max(0, Math.min(100, v));
function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
function log(st,key,vars){ st.history.unshift({ key, vars: vars||{} }); if (st.history.length>40) st.history.pop(); }
function costOf(a){ return { power:Math.max(0, -(a.power||0)), o2:Math.max(0, -(a.o2||0)) }; }

const Engine = {
  newGame(){
    const st = {
      sol:1, picksLeft:2, dust:0, over:false, won:false, noPower:0, shieldWarned:false,
      pending:[], history:[], alertKey:'', deck:shuffle(DATA.DONKI_EVENTS.slice()),
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
    const a = ACTIONS[id];
    st.power  = clamp(st.power  + (a.power ||0));
    st.oxygen = clamp(Math.min(st.oxygen, st.maxO2) + (a.o2||0));
    st.shield = clamp(st.shield + (a.shield||0));
    if (a.science) st.pending.push({ due: st.sol + a.delay, pts: a.science });
    st.picksLeft--;
    log(st,'log.act',{ id });
    return true;
  },

  nextSol(st){
    if (st.over) return;
    st.alertKey = '';
    st.picksLeft = 2;

    // dark night: empty batteries cost extra oxygen and can end the mission
    const dark = st.power <= 0;
    st.noPower = dark ? st.noPower + 1 : 0;
    if (st.noPower >= 2){ st.over = true; log(st,'log.failPower'); return; }

    // passive life support
    st.power  = clamp(st.power  + (st.dust>0 ? CFG.DUST_INCOME : CFG.INCOME));
    st.oxygen = clamp(Math.min(st.oxygen, st.maxO2) - CFG.O2_DRAIN - (dark ? CFG.NO_POWER_DRAIN : 0));
    st.shield = clamp(st.shield - CFG.SHIELD_DECAY);
    if (st.dust>0 && --st.dust===0) log(st,'log.dustEnd');
    if (dark) log(st,'log.dark');
    if (st.shield===0 && !st.shieldWarned){ log(st,'log.shieldDown'); st.shieldWarned = true; }
    if (st.shield>0) st.shieldWarned = false;

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

    // science data arrives on Earth after the real Mars comm delay
    st.pending = st.pending.filter(p => {
      if (p.due === st.sol){
        st.science += p.pts;
        log(st,'log.science',{ n: p.pts });
        return false;
      }
      return true;
    });

    // end conditions
    if (st.oxygen <= 0){ st.over = true; log(st,'log.failO2'); }
    else if (st.sol >= CFG.WIN_SOL){ st.over = true; st.won = true; }
    else st.sol++;
  },

  radiation(st,ev){
    const S = ev.severity, before = st.shield, need = S * CFG.ABSORB;
    if (before >= need){
      st.shield = clamp(before - S*CFG.SHIELD_HIT);
      st.alertKey = 'alert.absorbed';
      log(st,'log.absorbed',{ date: ev.date, hit: S*CFG.SHIELD_HIT, ev });
    } else {
      // unshielded: the blast damages the oxygen equipment permanently
      const o2Hit = Math.max(S*4, Math.floor((need - before) * 0.6));
      st.maxO2 = Math.max(CFG.MIN_O2_GEAR, st.maxO2 - o2Hit);
      st.oxygen = clamp(Math.min(st.oxygen, st.maxO2) - o2Hit);
      st.shield = 0;
      st.shieldWarned = true;
      st.alertKey = 'alert.storm';
      log(st,'log.stormHit',{ date: ev.date, max: st.maxO2, o2: o2Hit, ev });
    }
  },

  score(st){ return st.science*10 + st.oxygen; },
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
    ['power','oxygen','shield'].forEach(k => {
      const bar = document.querySelector('.bar[data-k="'+k+'"]');
      bar.querySelector('label').textContent = t(k);
      bar.querySelector('.fill').style.width = st[k]+'%';
      bar.querySelector('.val').textContent = Math.round(st[k]);
    });
    document.querySelector('.cap').style.left = st.maxO2+'%';
    $('#sci').textContent = t('science')+' '+st.science + t('inTransit',{ n: st.pending.reduce((n,p)=>n+p.pts,0) });
    $('#alert').textContent = st.alertKey ? t(st.alertKey) : '';
    $('#picks').textContent = t('picks',{ n:st.picksLeft });
    $('#nextSol').textContent = t('endSol');
    document.querySelectorAll('#btns button').forEach(b => { b.disabled = !Engine.canDo(st, b.dataset.act); });
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
      t('end.science',{ n: st.science, pts: st.science*10 })+'\n'+
      t('end.o2',{ n: Math.round(st.oxygen), max: st.maxO2 })+'\n'+
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
    b.onclick = () => { if (Engine.doAction(st,id)) render(); };
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
  const greedy = s => s.shield < 70 ? 'shieldUp' : s.oxygen < 60 ? 'recycler' : s.power >= 40 ? 'science' : s.oxygen < 85 ? 'recycler' : null;
  const careless = s => s.oxygen < 55 ? 'recycler' : s.power >= 40 ? 'science' : null;

  for (const [id,a] of Object.entries(ACTIONS)){
    const c = costOf(a);
    console.assert(c.power>0 || c.o2>0, id+' must cost something (no free choices)');
  }
  let wins = 0, aMax = 0, bMax = 0, bWins = 0, N = 100;
  for (let i = 0; i < N; i++){
    const a = simulate(greedy), b = simulate(careless);
    aMax += a.maxO2; bMax += b.maxO2;
    if (a.won) wins++;
    if (b.won) bWins++;
  }
  console.assert(wins / N >= 0.7, 'greedy should win most runs (' + wins + '/' + N + ')');
  console.assert(bWins / N < 0.3, 'never-shield strategy should fail most runs (' + bWins + '/' + N + ')');
  console.assert(aMax / N > bMax / N, 'greedy should keep gear healthier than careless');

  const s = Engine.newGame();
  const ids = Object.keys(ACTIONS);
  for (let i=0; i<200 && !s.over; i++){
    const ok = ids.filter(id => Engine.canDo(s,id));
    if (ok.length) Engine.doAction(s, ok[(Math.random()*ok.length)|0]);
    else Engine.nextSol(s);
  }
  console.assert([s.power,s.oxygen,s.shield,s.maxO2].every(Number.isFinite), 'no NaN under random play');

  console.log('Self-tests: greedy won ' + wins + '/' + N + ' (avg maxO2 ' + Math.round(aMax / N) +
              ') | careless won ' + bWins + '/' + N + ' (avg maxO2 ' + Math.round(bMax / N) + ') | random ok');
}

if (typeof module !== 'undefined') module.exports = { Engine, ACTIONS, CFG };
