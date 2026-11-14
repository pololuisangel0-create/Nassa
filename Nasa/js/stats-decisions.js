/* stats-decisions.js — Stats (barras y oxígeno máximo) y Decisions (acciones, cultivos y deshacer).
   Piezas de estado sin UI. Game (game.js) decide cuándo se usan. */

const CFG = {
  WIN_SOL: 30,
  START: { power: 50, oxygen: 80, shield: 60, food: 60, maxO2: 100 },
  PICKS_PER_SOL: 1,   // acciones permitidas por sol
  INCOME: 14, DUST_INCOME: 3,
  O2_DRAIN: 10, FOOD_DRAIN: 10, SHIELD_DECAY: 5, MIN_O2_GEAR: 30,
  WARN_LOW: 10,   // umbral del aviso "casi vacío"
};

/* "crops" NO da comida al plantar: la cosecha llega 3 soles después. */
const ACTIONS = {
  recycler: { o2: 30, power: -12 },
  shieldUp: { shield: 30, power: -20 },
  crops:    { power: -12, o2: -6, delay: 3, harvest: 25 },
};

const costOf = a => ({ power: Math.max(0, -(a.power || 0)), o2: Math.max(0, -(a.o2 || 0)) });

/* ---------- Stats: las 4 barras y el oxígeno máximo ---------- */
class Stats {
  constructor(start){ Object.assign(this, start); }
  static clamp(v){ return Math.max(0, Math.min(100, v)); }
  add(key, delta){ this[key] = Stats.clamp(this[key] + delta); }
  capOxygen(){ this.oxygen = Math.min(this.oxygen, this.maxO2); }
  snapshot(){
    return { power: this.power, oxygen: this.oxygen, shield: this.shield, food: this.food, maxO2: this.maxO2 };
  }
  restore(s){ Object.assign(this, s); }
}

/* ---------- Decisions: acciones, cultivos y deshacer ----------
   Recibe el juego para leer stats, sol y log. Sus cambios de log van por game.log. */
class Decisions {
  constructor(game){
    this.game = game;
    this.picksLeft = CFG.PICKS_PER_SOL;
    this.undoStack = [];
    this.growing = [];   // cultivos en marcha: { due, food }
  }

  resetForSol(){
    this.picksLeft = CFG.PICKS_PER_SOL;
    this.undoStack = [];
  }

  canDo(id){
    const g = this.game, a = ACTIONS[id];
    if (g.over || this.picksLeft <= 0 || !a) return false;
    const c = costOf(a);
    // se reserva un sol de oxígeno como colchón
    return g.stats.power >= c.power && g.stats.oxygen >= c.o2 + CFG.O2_DRAIN;
  }

  do(id){
    if (!this.canDo(id)) return false;
    const g = this.game, a = ACTIONS[id], s = g.stats;

    // foto previa para poder cancelar la acción
    this.undoStack.push({
      id,
      stats: s.snapshot(),
      picksLeft: this.picksLeft,
      growing: this.growing.map(c => ({ ...c })),
      logLen: g.log.length,
    });

    s.capOxygen();
    if (a.power)  s.add('power', a.power);
    if (a.o2)     s.add('oxygen', a.o2);
    if (a.shield) s.add('shield', a.shield);
    if (a.delay)  this.growing.push({ due: g.sol + a.delay, food: a.harvest });

    this.picksLeft--;
    g.log.push('log.act', { id });
    return true;
  }

  /* cancela la última vez que se usó `id` y todo lo posterior */
  undo(id){
    for (let i = this.undoStack.length - 1; i >= 0; i--){
      const u = this.undoStack[i];
      if (u.id !== id) continue;
      this.game.stats.restore(u.stats);
      this.picksLeft = u.picksLeft;
      this.growing = u.growing;
      this.game.log.truncateTo(u.logLen);
      this.undoStack = this.undoStack.slice(0, i);
      return true;
    }
    return false;
  }

  active(){ return new Set(this.undoStack.map(u => u.id)); }

  /* cultivos que maduran en este sol: se quitan de la lista y se devuelven */
  harvest(sol){
    const ready = this.growing.filter(c => c.due === sol);
    this.growing = this.growing.filter(c => c.due !== sol);
    return ready;
  }

  /* tormenta sin escudo: se pierden todos los cultivos */
  loseCrops(){
    const had = this.growing.length > 0;
    this.growing = [];
    return had;
  }
}

if (typeof module !== 'undefined') module.exports = { CFG, ACTIONS, costOf, Stats, Decisions };