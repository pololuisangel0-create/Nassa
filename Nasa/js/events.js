/* events.js — Clima espacial (archivo nuevo).
   Responsable de: el mazo de tormentas reales de NASA DONKI, el polvo marciano,
   la programación de eventos (cada N soles) y el impacto de una tormenta sobre el escudo.
   No modifica el estado del juego: devuelve resultados que game.js aplica. */

const WEATHER_DATA = (typeof module !== 'undefined')
  ? require('./data.js')
  : { DONKI_EVENTS, RADLAB, REAL_FACTS };

class SpaceWeather {
  constructor(rng = Math.random){
    this.rng = rng;
    this.deck = this._shuffled();
    this.dustLeft = 0;
  }

  get dusty(){ return this.dustLeft > 0; }

  /* Lo llama el juego cada noche. Devuelve true el sol en que la tormenta de polvo termina. */
  tickDust(){
    return this.dustLeft > 0 && --this.dustLeft === 0;
  }

  /* ¿Toca sortear un evento este sol? */
  isEventDay(sol){
    return sol % SpaceWeather.CFG.EVERY === 0;
  }

  /* Sortea el evento del día. Devuelve { type: 'radiation' | 'dust' | 'quiet', ... }. */
  roll(){
    const C = SpaceWeather.CFG;
    const r = this.rng();
    let result;
    if (r < C.STORM && this.deck.length){
      result = { type: 'radiation', ev: this.deck.pop() };
    } else if (r < C.STORM + C.DUST){
      this.dustLeft = C.DUST_LEN;
      result = { type: 'dust' };
    } else {
      result = { type: 'quiet' };
    }
    if (!this.deck.length) this.deck = this._shuffled();
    return result;
  }

  /* Impacto de una tormenta sobre el escudo. Función pura: no toca el estado. */
  static impact(shield, ev){
    const C = SpaceWeather.CFG;
    const S = ev.severity;
    const need = S * C.ABSORB;
    if (shield >= need){
      return { absorbed: true, shieldLoss: S * C.SHIELD_HIT };
    }
    // sin escudo suficiente: el equipo de oxígeno se daña de forma permanente
    return { absorbed: false, o2Hit: Math.max(S * 4, Math.floor((need - shield) * 0.6)) };
  }

  _shuffled(){
    const a = WEATHER_DATA.DONKI_EVENTS.slice();
    for (let i = a.length - 1; i > 0; i--){
      const j = Math.floor(this.rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

SpaceWeather.CFG = {
  EVERY: 4, STORM: 0.45, DUST: 0.25, DUST_LEN: 2,
  ABSORB: 8, SHIELD_HIT: 4,   // tormenta absorbida si escudo >= severidad*ABSORB
};

if (typeof module !== 'undefined') module.exports = { SpaceWeather };