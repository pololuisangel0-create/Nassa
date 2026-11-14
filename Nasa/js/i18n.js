/* UI text — English (default) and Spanish. Language persists in localStorage. */
const TEXTS = {
  en: {
    title: 'JUNIOR ASTRONAUT: MARS OUTPOST',
    sol: 'SOL {n} / {total}',
    dust: ' · DUST STORM',
    power: 'POWER', oxygen: 'OXYGEN', shield: 'SHIELD',
    science: 'SCIENCE', inTransit: ' · in transit {n}',
    picks: 'Actions left this sol: {n}',
    endSol: 'END SOL ▶', flyAgain: 'FLY AGAIN ▶', langBtn: 'ES',
    whatsReal: "What's real in this game?",

    'act.recycler.name': 'Water Recycler', 'act.recycler.hint': '+30 oxygen, −12 power',
    'act.shieldUp.name': 'Reinforce Shield', 'act.shieldUp.hint': '+30 shield, −20 power',
    'act.science.name': 'Science Scan', 'act.science.hint': 'science +15 (2-sol delay), −10 power, −6 oxygen',

    'log.intro': '🚀 Touchdown! You command the Mars outpost. Survive {n} sols.',
    'log.act': '🔧 {name}: {hint}',
    'log.quiet': '☀ Quiet sun today. No big solar events.',
    'log.dustStart': '🌪 Dust storm — solar panels get almost no sun for 2 sols!',
    'log.dustEnd': '🌤 The dust storm cleared. Solar power is back.',
    'log.dark': '⚠ Batteries empty! Oxygen drains fast until you recharge.',
    'log.absorbed': '🛡 Real event {date} — {label}. Your shield took the blast (−{hit} shield). {note}',
    'log.stormHit': '☢ Real event {date} — {label}! Shield too weak: oxygen equipment damaged (max oxygen now {max}), oxygen −{o2}. {note}',
    'log.shieldDown': '⚠ Shield is DOWN! Reinforce it before the next solar storm.',
    'log.science': '📡 Your science data reached Earth after its 2-sol delay. +{n} science',
    'log.failO2': '💨 Oxygen ran out. Mission failed.',
    'log.failPower': '🔌 Power stayed at zero two nights — life support shut down. Mission failed.',

    'alert.storm': '☢ SOLAR STORM! Not enough shielding — equipment damaged!',
    'alert.absorbed': '🛡 Solar storm absorbed by your shield!',
    'alert.dust': '🌪 Dust storm — solar panels get almost no sun for 2 sols!',

    'end.win': 'MISSION SUCCESS!', 'end.lose': 'MISSION FAILED',
    'end.sols': 'Sols survived: {n}',
    'end.science': 'Science: {n} (×10 = {pts} pts)',
    'end.o2': 'Oxygen: {n} / {max}',
    'end.score': 'SCORE: {n}',
    'end.winLearn': 'You kept power, oxygen and shielding in balance — that is real mission planning.',
    'end.lastLog': 'Last entry: ',

    'real.stormsIntro': '☀ Solar storms are real NASA DONKI records — space weather that drives radiation risk:',
    'real.radlab': '☢ Radiation is real: {instrument} really measured {rate} μGy/hour (NASA OSDR RadLab). {note}',
  },
  es: {
    title: 'ASTRONAUTA JÚNIOR: PUESTO EN MARTE',
    sol: 'SOL {n} / {total}',
    dust: ' · TORMENTA DE POLVO',
    power: 'ENERGÍA', oxygen: 'OXÍGENO', shield: 'ESCUDO',
    science: 'CIENCIA', inTransit: ' · en camino {n}',
    picks: 'Acciones restantes este sol: {n}',
    endSol: 'TERMINAR SOL ▶', flyAgain: 'JUGAR OTRA VEZ ▶', langBtn: 'EN',
    whatsReal: '¿Qué es real en este juego?',

    'act.recycler.name': 'Recicladora de Agua', 'act.recycler.hint': '+30 oxígeno, −12 energía',
    'act.shieldUp.name': 'Reforzar Escudo', 'act.shieldUp.hint': '+30 escudo, −20 energía',
    'act.science.name': 'Escaneo Científico', 'act.science.hint': 'ciencia +15 (llega en 2 soles), −10 energía, −6 oxígeno',

    'log.intro': '🚀 ¡Aterrizaje! Comandas el puesto avanzado de Marte. Sobrevive {n} soles.',
    'log.act': '🔧 {name}: {hint}',
    'log.quiet': '☀ Sol tranquilo hoy. Sin grandes eventos solares.',
    'log.dustStart': '🌪 ¡Tormenta de polvo! Los paneles casi no recibirán sol por 2 soles.',
    'log.dustEnd': '🌤 La tormenta de polvo pasó. La energía solar vuelve.',
    'log.dark': '⚠ ¡Baterías vacías! El oxígeno se drena rápido hasta que recargues.',
    'log.absorbed': '🛡 Evento real {date} — {label}. ¡Tu escudo aguantó el golpe (−{hit} escudo)! {note}',
    'log.stormHit': '☢ Evento real {date} — {label}! Escudo débil: equipo de oxígeno dañado (oxígeno máximo ahora {max}), oxígeno −{o2}. {note}',
    'log.shieldDown': '⚠ ¡Escudo en CERO! Refuérzalo antes de la próxima tormenta solar.',
    'log.science': '📡 Tus datos científicos llegaron a la Tierra tras el retraso de 2 soles. +{n} ciencia',
    'log.failO2': '💨 Se acabó el oxígeno. Misión fallida.',
    'log.failPower': '🔌 La energía estuvo en cero dos noches — el soporte vital se apagó. Misión fallida.',

    'alert.storm': '☢ ¡TORMENTA SOLAR! Escudo insuficiente — ¡equipo dañado!',
    'alert.absorbed': '🛡 ¡Tormenta solar absorbida por tu escudo!',
    'alert.dust': '🌪 Tormenta de polvo — ¡casi sin energía solar por 2 soles!',

    'end.win': '¡MISIÓN LOGRADA!', 'end.lose': 'MISIÓN FALLIDA',
    'end.sols': 'Soles sobrevividos: {n}',
    'end.science': 'Ciencia: {n} (×10 = {pts} pts)',
    'end.o2': 'Oxígeno: {n} / {max}',
    'end.score': 'PUNTUACIÓN: {n}',
    'end.winLearn': 'Mantuviste energía, oxígeno y escudo en equilibrio — eso es planear una misión real.',
    'end.lastLog': 'Último aviso: ',

    'real.stormsIntro': '☀ Las tormentas solares son registros reales de NASA DONKI — el clima espacial que causa el riesgo de radiación:',
    'real.radlab': '☢ La radiación es real: {instrument} realmente midió {rate} μGy/hora (NASA OSDR RadLab). {note}',
  },
};

let LANG = 'en';
try { LANG = localStorage.getItem('lang') || 'en'; } catch (e) {}

function t(key, vars){
  let s = (TEXTS[LANG] && TEXTS[LANG][key]) || TEXTS.en[key] || key;
  if (vars) for (const k in vars) if (vars[k] !== undefined) s = s.split('{'+k+'}').join(vars[k]);
  return s;
}
/* localized field lookup: en fields are unsuffixed ('label'), es fields are 'label_es' */
function L(obj, field){
  return (LANG === 'es' && obj[field+'_es'] != null) ? obj[field+'_es'] : obj[field];
}
