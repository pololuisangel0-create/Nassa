/* events.js — Clima espacial: mazo de tormentas reales, tormentas de arena,
   pronóstico y datos en vivo de DONKI.
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
    this.dustLevelId = null;
    this.dustIncome = 0;  // recarga de energía por sol mientras dura la tormenta de arena en curso
    this.lastEv = null;   // último evento sorteado (para no repetirlo seguido)
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
    this.lastEv = null;
    return true;
  }

  /* Sortea el evento de una noche de evento. Solo hay dos tipos:
     { type:'radiation', ev } (tormenta solar real) o { type:'dust' } (tormenta de arena).
     Función sin efectos secundarios: el polvo empieza al aplicarse (startDust). */
  draw(opts = {}){
    const C = SpaceWeather.CFG;
    // con polvo aún activo no puede salir otra tormenta de polvo encima: se fuerza solar
    if (opts.noDust || this.rng() < C.STORM){
      return { type: 'radiation', ev: this._nextEvent() };
    }
    // intensidad y duración se deciden ya, para poder avisarlas con antelación
    return { type: 'dust', level: SpaceWeather.pickDustLevel(this.rng()), days: this._dustDays() };
  }

  /* Duración al azar: entre DUST_MIN y DUST_MAX soles. */
  _dustDays(){
    const C = SpaceWeather.CFG;
    return C.DUST_MIN + Math.floor(this.rng() * (C.DUST_MAX - C.DUST_MIN + 1));
  }

  /* Variaciones de la tormenta de arena: cuanto más fuerte, menos energía se recarga por sol. */
  static pickDustLevel(r){
    const L = SpaceWeather.CFG.DUST_LEVELS;
    return L[Math.min(L.length - 1, Math.floor(r * L.length))];
  }

  /* ¿Hay una tormenta de arena en curso? Mientras la haya, NO se puede sortear ni avisar otra:
     la duración ya está decidida desde que empezó, así que dustLeft > 0 basta para saberlo. */
  dustBusy(){
    return this.dustLeft > 0;
  }

  /* Se llama cuando la tormenta de arena empieza de verdad, no al pronosticarla.
     Dura entre DUST_MIN y DUST_MAX soles (al azar) y recarga `level.income` de energía por sol.
     Devuelve la duración elegida. */
  startDust(level, days){
    const C = SpaceWeather.CFG;
    level = level || SpaceWeather.pickDustLevel(this.rng());
    this.dustIncome = level.income;
    this.dustLevelId = level.id;
    this.dustLeft = days || this._dustDays();
    return this.dustLeft;
  }

  /* Lo llama el juego cada noche. Devuelve true la noche en que el polvo termina. */
  tickDust(){
    return this.dustLeft > 0 && --this.dustLeft === 0;
  }

  isEventDay(sol){
    return sol % SpaceWeather.CFG.EVERY === 0;
  }

  /* Escudo que quita la tormenta solar (y que hace falta tener para sobrevivirla): depende de su severidad.
     La tormenta solar afecta SOLO al escudo. */
  static need(ev){
    return ev.severity * SpaceWeather.CFG.SHIELD_PER_SEV;
  }

  /* Impacto de una tormenta solar. Función pura.
     Escudo suficiente: se absorbe y el escudo pierde `need` (nunca baja de 1 por esto).
     Escudo insuficiente: radiación mortal. Oxígeno, comida y energía no intervienen. */
  static impact(shield, ev){
    const need = SpaceWeather.need(ev);
    if (shield >= need){
      return { absorbed: true, shieldLoss: Math.min(need, Math.max(0, shield - 1)) };
    }
    return { absorbed: false, lethal: true };
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

  /* Saca el siguiente evento del mazo. Al rebarajar, evita que salga el mismo que el anterior. */
  _nextEvent(){
    if (!this.deck.length){
      this.deck = this._shuffled();
      const top = this.deck.length - 1;
      if (this.deck.length > 1 && this.deck[top] === this.lastEv){
        this.deck.unshift(this.deck.pop());   // manda el repetido al fondo
      }
    }
    this.lastEv = this.deck.pop();
    return this.lastEv;
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
  EVERY: 5,           // cada cuántos soles hay evento
  STORM: 0.4,         // probabilidad de tormenta solar; el resto son tormentas de arena
  DUST_MIN: 3, DUST_MAX: 6,   // la tormenta de polvo dura entre 3 y 6 soles (al azar)
  SHIELD_PER_SEV: 6,  // escudo que quita una tormenta solar = severidad × 6 (severidad 10 → 60, 9 → 54, 5 → 30)
  // variaciones de la tormenta de arena (solo afecta a la energía): recarga por sol mientras dura (normal: 14)
  DUST_LEVELS: [
    { id: 'light',    income: 10 },
    { id: 'moderate', income: 5 },
    { id: 'severe',   income: 0 },
  ],
};
SpaceWeather.liveEvents = null;   // se llena si DONKI responde

if (typeof module !== 'undefined') module.exports = { SpaceWeather };