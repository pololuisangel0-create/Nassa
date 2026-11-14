/* UI text — English (default) and Spanish. Language persists in localStorage. */
const TEXTS = {
  en: {
    title: 'JUNIOR ASTRONAUT: MARS OUTPOST',
    sol: 'SOL {n} / {total}',
    dust: ' · DUST STORM',
    power: 'POWER', oxygen: 'OXYGEN', shield: 'SHIELD', food: 'FOOD',
    cropsLine: '🌱 {n} growing · harvest in {d} sols',
    picks: 'Actions left this sol: {n}',
    endSol: 'END SOL ▶', flyAgain: 'FLY AGAIN ▶', langBtn: 'ES',
    whatsReal: "What's real in this game?",

    'act.recycler.name': 'Water Recycler', 'act.recycler.hint': '+30 oxygen, −12 power',
    'act.shieldUp.name': 'Reinforce Shield', 'act.shieldUp.hint': '+30 shield, −20 power',
    'act.crops.name': 'Grow Crops', 'act.crops.hint': 'food +25 at harvest (3 sols), −12 power, −6 oxygen',

    'log.intro': '🚀 Touchdown! You command the Mars outpost. Survive {n} sols.',
    'log.act': '🔧 {name}: {hint}',
    'log.quiet': '☀ Quiet sun today. No big solar events.',
    'log.dustStart': '🌪 Dust storm — solar panels get almost no sun for 2 sols!',
    'log.dustEnd': '🌤 The dust storm cleared. Solar power is back.',
    'log.lowPower': '⚠ Batteries almost empty!',
    'log.lowShield': '⚠ Shield almost empty! Reinforce it.',
    'log.absorbed': '🛡 Real event {date} — {label}. Your shield took the blast (−{hit} shield). {note}',
    'log.stormHit': '☢ Real event {date} — {label}! Shield too weak: oxygen equipment damaged (max oxygen now {max}), oxygen −{o2}. {note}',
    'log.cropsDone': '🌾 Harvest! +{n} food',
    'log.cropsLost': '☄ The storm destroyed your growing crops!',
    'log.noFood': '🍽 Food is gone! You have 1 sol to get food or the mission fails.',
    'log.failO2': '💨 Oxygen ran out. Mission failed.',
    'log.failPower': '🔌 Batteries at zero — life support offline. Mission failed.',
    'log.failShield': '🛡 Shield at zero — the outpost is defenseless. Mission failed.',
    'log.failFood': '🍽 The crew ran out of food. Mission failed.',

    'alert.storm': '☢ SOLAR STORM! Not enough shielding — equipment damaged!',
    'alert.absorbed': '🛡 Solar storm absorbed by your shield!',
    'alert.dust': '🌪 Dust storm — solar panels get almost no sun for 2 sols!',

    'end.win': 'MISSION SUCCESS!', 'end.lose': 'MISSION FAILED',
    'end.sols': 'Sols survived: {n}',
    'end.o2': 'Oxygen: {n} / {max}',
    'end.food': 'Food: {n}',
    'end.score': 'SCORE: {n}',
    'end.winLearn': 'You kept power, oxygen, shielding and food in balance — that is real mission planning.',
    'end.lastLog': 'Last entry: ',

    'real.stormsIntro': '☀ Solar storms are real NASA DONKI records — space weather that drives radiation risk:',
    'real.radlab': '☢ Radiation is real: {instrument} really measured {rate} μGy/hour (NASA OSDR RadLab). {note}',
  },
  es: {
    title: 'ASTRONAUTA JÚNIOR: PUESTO EN MARTE',
    sol: 'SOL {n} / {total}',
    dust: ' · TORMENTA DE POLVO',
    power: 'ENERGÍA', oxygen: 'OXÍGENO', shield: 'ESCUDO', food: 'COMIDA',
    cropsLine: '🌱 {n} creciendo · cosecha en {d} soles',
    picks: 'Acciones restantes este sol: {n}',
    endSol: 'TERMINAR SOL ▶', flyAgain: 'JUGAR OTRA VEZ ▶', langBtn: 'EN',
    whatsReal: '¿Qué es real en este juego?',

    'act.recycler.name': 'Recicladora de Agua', 'act.recycler.hint': '+30 oxígeno, −12 energía',
    'act.shieldUp.name': 'Reforzar Escudo', 'act.shieldUp.hint': '+30 escudo, −20 energía',
    'act.crops.name': 'Cultivar Alimentos', 'act.crops.hint': 'comida +25 en cosecha (3 soles), −12 energía, −6 oxígeno',

    'log.intro': '🚀 ¡Aterrizaje! Comandas el puesto avanzado de Marte. Sobrevive {n} soles.',
    'log.act': '🔧 {name}: {hint}',
    'log.quiet': '☀ Sol tranquilo hoy. Sin grandes eventos solares.',
    'log.dustStart': '🌪 ¡Tormenta de polvo! Los paneles casi no recibirán sol por 2 soles.',
    'log.dustEnd': '🌤 La tormenta de polvo pasó. La energía solar vuelve.',
    'log.lowPower': '⚠ ¡Baterías casi vacías!',
    'log.lowShield': '⚠ ¡Escudo casi vacío! Refuérzalo.',
    'log.absorbed': '🛡 Evento real {date} — {label}. ¡Tu escudo aguantó el golpe (−{hit} escudo)! {note}',
    'log.stormHit': '☢ Evento real {date} — {label}! Escudo débil: equipo de oxígeno dañado (oxígeno máximo ahora {max}), oxígeno −{o2}. {note}',
    'log.cropsDone': '🌾 ¡Cosecha! +{n} comida',
    'log.cropsLost': '☄ ¡La tormenta destruyó los cultivos en crecimiento!',
    'log.noFood': '🍽 ¡Comida agotada! Tienes 1 sol para conseguir comida o la misión falla.',
    'log.failO2': '💨 Se acabó el oxígeno. Misión fallida.',
    'log.failPower': '🔌 Baterías en cero — soporte vital apagado. Misión fallida.',
    'log.failShield': '🛡 Escudo en cero — el puesto queda indefenso. Misión fallida.',
    'log.failFood': '🍽 La tripulación se quedó sin comida. Misión fallida.',

    'alert.storm': '☢ ¡TORMENTA SOLAR! Escudo insuficiente — ¡equipo dañado!',
    'alert.absorbed': '🛡 ¡Tormenta solar absorbida por tu escudo!',
    'alert.dust': '🌪 Tormenta de polvo — ¡casi sin energía solar por 2 soles!',

    'end.win': '¡MISIÓN LOGRADA!', 'end.lose': 'MISIÓN FALLIDA',
    'end.sols': 'Soles sobrevividos: {n}',
    'end.o2': 'Oxígeno: {n} / {max}',
    'end.food': 'Comida: {n}',
    'end.score': 'PUNTUACIÓN: {n}',
    'end.winLearn': 'Mantuviste energía, oxígeno, escudo y comida en equilibrio — eso es planear una misión real.',
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
