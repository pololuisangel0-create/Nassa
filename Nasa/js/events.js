/* events.js — Clima espacial: mazo de eventos, sorteo, pronóstico y datos en vivo de DONKI.
   No modifica el estado del juego: devuelve resultados que game.js aplica. */

const WEATHER_DATA = (typeof module !== 'undefined')
  ? require('./data.js')
  : { DONKI_EVENTS, RADLAB, REAL_FACTS };

/* Clave de api.nasa.gov. DEMO_KEY sirve para pruebas, con límite bajo por IP.
   Sustitúyela por tu clave. En el navegador la clave es visible para cualquiera. */
const NASA_API_KEY = 'DEMO_KEY';

class SpaceWeather {
  constructor(rng = Math.random){
    this.rng = rng;
    this.dustLeft = 0;
    const live = SpaceWeather.liveEvents;
    this.pool = live || WEATHER_DATA.DONKI_EVENTS;
    this.source = live ? 'live' : 'archived';
    this.deck = this._shuffled();
  }

  get dusty(){ return this.dustLeft > 0; }

  /* Cambia el conjunto de eventos (por ejemplo, al llegar datos en vivo). */
  setPool(events, source){
    if (!events || !events.length) return false;
    this.pool = events;
    this.source = source;
    this.deck = this._shuffled();
    return true;
  }

  /* Sortea un evento sin efectos secundarios.
     Devuelve { type:'radiation', ev } | { type:'dust' } | { type:'quiet' }. */
  draw(){
    const C = SpaceWeather.CFG, r = this.rng();
    if (r < C.STORM){
      if (!this.deck.length) this.deck = this._shuffled();
      return { type: 'radiation', ev: this.deck.pop() };
    }
    if (r < C.STORM + C.DUST) return { type: 'dust' };
    return { type: 'quiet' };
  }

  /* Se llama cuando el polvo empieza de verdad, no al pronosticarlo. */
  startDust(){ this.dustLeft = SpaceWeather.CFG.DUST_LEN; }

  /* Lo llama el juego cada noche. Devuelve true el sol en que el polvo termina. */
  tickDust(){
    return this.dustLeft > 0 && --this.dustLeft === 0;
  }

  isEventDay(sol){
    return sol % SpaceWeather.CFG.EVERY === 0;
  }

  /* Escudo necesario para absorber una tormenta. */
  static need(ev){
    return ev.severity * SpaceWeather.CFG.ABSORB;
  }

  /* Impacto de una tormenta sobre el escudo. Función pura. */
  static impact(shield, ev){
    const C = SpaceWeather.CFG, S = ev.severity, need = SpaceWeather.need(ev);
    if (shield >= need){
      return { absorbed: true, shieldLoss: S * C.SHIELD_HIT };
    }
    // sin escudo suficiente: el equipo de oxígeno se daña de forma permanente
    return { absorbed: false, o2Hit: Math.max(S * 4, Math.floor((need - shield) * 0.6)) };
  }

  /* Severidad de 2 a 10 según la clase de la fulguración (X8.7, M5.1…). */
  static severityOf(cls){
    const num = parseFloat(cls.slice(1)) || 1;
    if (cls[0] === 'X') return Math.min(10, Math.round(5 + num * 0.5));
    return Math.min(5, Math.max(2, Math.round(2 + num * 0.3)));
  }

  /* Convierte la respuesta de DONKI FLR en eventos del juego (los 8 más fuertes). */
  static fromDonki(raw){
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(f => f && /^[MX]\d/i.test(f.classType || ''))
      .map(f => {
        const cls = f.classType.toUpperCase();
        return {
          date: (f.beginTime || '').slice(0, 10),
          kind: 'FLR',
          label: cls + ' solar flare',
          label_es: 'Fulguración solar ' + cls,
          severity: SpaceWeather.severityOf(cls),
          note: 'Live record from NASA DONKI (FLR).',
          note_es: 'Registro en vivo de NASA DONKI (FLR).',
        };
      })
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 8);
  }

  /* Pide las fulguraciones de los últimos 30 días a DONKI.
     Devuelve la lista, o null si falla (sin red, CORS, límite de llamadas, tiempo agotado). */
  static async loadLive(timeoutMs = 6000){
    if (typeof fetch === 'undefined') return null;
    const end = new Date(), start = new Date(end.getTime() - 30 * 864e5);
    const iso = d => d.toISOString().slice(0, 10);
    const url = 'https://api.nasa.gov/DONKI/FLR?startDate=' + iso(start) +
                '&endDate=' + iso(end) + '&api_key=' + NASA_API_KEY;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return null;
      const events = SpaceWeather.fromDonki(await res.json());
      if (!events.length) return null;
      SpaceWeather.liveEvents = events;
      return events;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  _shuffled(){
    const a = this.pool.slice();
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
SpaceWeather.liveEvents = null;   // se llena si DONKI responde

if (typeof module !== 'undefined') module.exports = { SpaceWeather };