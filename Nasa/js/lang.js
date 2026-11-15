/* lang.js — Textos de la interfaz en inglés (por defecto) y español.
   El idioma se guarda en localStorage.

   Convenciones de los textos:
   - Las duraciones se dan siempre en "soles" (un sol = un día en Marte).
   - {n|sol|soles} elige singular/plural según el valor de n.
   - {days}, {low} y {normal} vienen de la configuración (CFG), nunca se escriben a mano. */
const TEXTS = {
  en: {
    title: 'JUNIOR ASTRONAUT: MARS OUTPOST',
    sol: 'SOL {n} / {total}',
    dust: ' · DUST STORM',
    power: 'POWER', oxygen: 'OXYGEN', shield: 'SHIELD', food: 'FOOD',
    cropsLine: '🌱 {n} growing · harvest in {d} {d|sol|sols}',
    endSol: 'END SOL ▶', flyAgain: 'FLY AGAIN ▶', langBtn: 'ES',
    whatsReal: "What's real in this game?",
    'ui.telemetry': 'TELEMETRY', 'ui.actions': 'ACTIONS', 'ui.log': 'FLIGHT LOG',
    'audio.musicOn': 'Turn music on', 'audio.musicOff': 'Turn music off',
    'audio.sfxOn': 'Turn sound effects on', 'audio.sfxOff': 'Turn sound effects off',

    'src.loading': 'Connecting to NASA DONKI…',
    'src.live': 'LIVE DATA · NASA DONKI',
    'src.archived': 'ARCHIVED DATA',

    'dust.active': '🌪 Dust storm: {n} {n|sol|sols} left · solar recharge +{low} per sol',

    'cd.radiation': '☢ Solar storm in {n} {n|sol|sols}',
    'cd.radiation.now': '☢ Solar storm tonight (when you end this sol)',
    'cd.need': '🛡 shield needed {need}',
    'cd.level': '{level} · lasts {days} {days|sol|sols} · recharge +{low} per sol',
    'lvl.light': 'light', 'lvl.moderate': 'moderate', 'lvl.severe': 'severe',
    'cd.dust': '🌪 Dust storm in {n} {n|sol|sols}',
    'cd.dust.now': '🌪 Dust storm tonight (when you end this sol)',

    'fc.title.radiation': '☢ SOLAR STORM WARNING',
    'fc.title.dust': '🌪 DUST STORM WARNING',
    'fc.when': 'Arrives at the end of sol {target} (in {n} {n|sol|sols})',
    'fc.dust': 'A {level} dust storm will cover the solar panels for {days} {days|sol|sols}: at the end of each sol your batteries will only recharge +{low} instead of +{normal}. Spend power carefully.',
    'fc.radiation': 'This solar storm takes {dmg} shield in one go. With less than {dmg} the radiation is lethal and the mission fails. The stronger the storm, the more shield it takes.',
    'fc.continue': 'CONTINUE ▶',
    'fc.need': 'Shield needed',
    'fc.ok': '✅ Enough shield: the storm will be absorbed.',
    'fc.short': '❌ Missing {n} shield: the radiation will be lethal. Reinforce the shield before then.',

    'act.recycler.name': 'Water Recycler', 'act.recycler.hint': '+30 oxygen, −20 power',
    'act.shieldUp.name': 'Reinforce Shield', 'act.shieldUp.hint': '+30 shield, −30 power',
    'act.crops.name': 'Grow Crops', 'act.crops.hint': 'food +50 at harvest (5 sols), −20 power, −20 oxygen',

    'log.intro': '🚀 Touchdown! You command the Mars outpost. Survive {n} sols.',
    'log.act': '🔧 {name}: {hint}',
    'log.dustStart': '🌪 A {level} dust storm covers the solar panels: at the end of each sol your batteries only recharge +{low} for {days} sols.',
    'log.dustEnd': '🌤 The dust storm cleared. Batteries recharge +{normal} per sol again.',
    'log.nextAlert': '📡 Next space weather event expected around sol {sol}. You will get a warning {ahead} {ahead|sol|sols} before.',
    'log.lowPower': '⚠ Batteries almost empty! At zero, life support goes offline.',
    'log.lowShield': '⚠ Shield almost empty! At zero the mission fails. Reinforce it.',
    'log.absorbed': '🛡 Real event {date} — {label}. Your shield took the blast (−{hit} shield). {note}',
    'log.stormHit': '☢ Real event {date} — {label}! You needed {need} shield but had {had}. {note}',
    'log.cropsDone': '🌾 Harvest! +{n} food',
    'log.cropsLost': '☄ The storm destroyed your growing crops!',
    'log.failO2': '💨 Oxygen ran out. Mission failed.',
    'log.failPower': '🔌 Batteries at zero — life support offline. Mission failed.',
    'log.failRadiation': '☢ Lethal radiation — the shield was too weak. Mission failed.',
    'log.failShield': '🛡 Shield at zero — the outpost is defenseless. Mission failed.',
    'log.failFood': '🍽 Food ran out. Mission failed.',

    'alert.storm': '☢ SOLAR STORM! Not enough shield: lethal radiation!',
    'alert.absorbed': '🛡 Solar storm absorbed! Your shield took the hit.',
    'alert.dust': '🌪 Dust storm! Your batteries will recharge less for {days} sols.',

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
    cropsLine: '🌱 {n} creciendo · cosecha en {d} {d|sol|soles}',
    endSol: 'TERMINAR SOL ▶', flyAgain: 'JUGAR OTRA VEZ ▶', langBtn: 'EN',
    whatsReal: '¿Qué es real en este juego?',
    'ui.telemetry': 'TELEMETRÍA', 'ui.actions': 'ACCIONES', 'ui.log': 'BITÁCORA',
    'audio.musicOn': 'Activar música', 'audio.musicOff': 'Silenciar música',
    'audio.sfxOn': 'Activar efectos', 'audio.sfxOff': 'Silenciar efectos',

    'src.loading': 'Conectando con NASA DONKI…',
    'src.live': 'DATOS EN VIVO · NASA DONKI',
    'src.archived': 'DATOS ARCHIVADOS',

    'dust.active': '🌪 Tormenta de polvo: {n} {n|sol|soles} más · recarga solar +{low} por sol',

    'cd.radiation': '☢ Tormenta solar en {n} {n|sol|soles}',
    'cd.radiation.now': '☢ Tormenta solar esta noche (al terminar este sol)',
    'cd.need': '🛡 escudo necesario {need}',
    'cd.level': '{level} · dura {days} {days|sol|soles} · recarga +{low} por sol',
    'lvl.light': 'leve', 'lvl.moderate': 'moderada', 'lvl.severe': 'severa',
    'cd.dust': '🌪 Tormenta de polvo en {n} {n|sol|soles}',
    'cd.dust.now': '🌪 Tormenta de polvo esta noche (al terminar este sol)',

    'fc.title.radiation': '☢ ALERTA: TORMENTA SOLAR',
    'fc.title.dust': '🌪 ALERTA: TORMENTA DE POLVO',
    'fc.when': 'Llega al final del sol {target} (en {n} {n|sol|soles})',
    'fc.dust': 'Una tormenta de polvo {level} cubrirá los paneles solares durante {days} {days|sol|soles}: al terminar cada sol tus baterías solo se recargarán +{low} en vez de +{normal}. Gasta la energía con cuidado.',
    'fc.radiation': 'Esta tormenta solar te quita {dmg} de escudo de golpe. Con menos de {dmg} la radiación es mortal y la misión fracasa. Cuanto más fuerte la tormenta, más escudo quita.',
    'fc.continue': 'CONTINUAR ▶',
    'fc.need': 'Escudo necesario',
    'fc.ok': '✅ Escudo suficiente: la tormenta será absorbida.',
    'fc.short': '❌ Te faltan {n} de escudo: la radiación será mortal. Refuerza el escudo antes de que llegue.',

    'act.recycler.name': 'Recicladora de Agua', 'act.recycler.hint': '+30 oxígeno, −20 energía',
    'act.shieldUp.name': 'Reforzar Escudo', 'act.shieldUp.hint': '+30 escudo, −30 energía',
    'act.crops.name': 'Cultivar Alimentos', 'act.crops.hint': 'comida +50 en cosecha ( soles), −20 energía, −20 oxígeno',

    'log.intro': '🚀 ¡Aterrizaje! Comandas el puesto avanzado de Marte. Sobrevive {n} soles.',
    'log.act': '🔧 {name}: {hint}',
    'log.dustStart': '🌪 Una tormenta de polvo {level} cubre los paneles solares: al terminar cada sol tus baterías solo se recargan +{low} durante {days} soles.',
    'log.dustEnd': '🌤 La tormenta de polvo pasó. Las baterías vuelven a recargarse +{normal} por sol.',
    'log.nextAlert': '📡 Próximo evento de clima espacial cerca del sol {sol}. Recibirás un aviso {ahead} {ahead|sol|soles} antes.',
    'log.lowPower': '⚠ ¡Baterías casi vacías! Si llegan a cero, el soporte vital se apaga.',
    'log.lowShield': '⚠ ¡Escudo casi vacío! Si llega a cero la misión falla. Refuérzalo.',
    'log.absorbed': '🛡 Evento real {date} — {label}. ¡Tu escudo aguantó el golpe (−{hit} escudo)! {note}',
    'log.stormHit': '☢ Evento real {date} — {label}. Necesitabas {need} de escudo y tenías {had}. {note}',
    'log.cropsDone': '🌾 ¡Cosecha! +{n} comida',
    'log.cropsLost': '☄ ¡La tormenta destruyó los cultivos en crecimiento!',
    'log.failO2': '💨 Se acabó el oxígeno. Misión fallida.',
    'log.failPower': '🔌 Baterías en cero — soporte vital apagado. Misión fallida.',
    'log.failRadiation': '☢ Radiación mortal — el escudo era demasiado débil. Misión fallida.',
    'log.failShield': '🛡 Escudo en cero — el puesto queda indefenso. Misión fallida.',
    'log.failFood': '🍽 Se acabó la comida. Misión fallida.',

    'alert.storm': '☢ ¡TORMENTA SOLAR! Escudo insuficiente: radiación mortal.',
    'alert.absorbed': '🛡 ¡Tormenta solar absorbida! Tu escudo aguantó el golpe.',
    'alert.dust': '🌪 ¡Tormenta de polvo! Tus baterías se recargarán menos durante {days} soles.',

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

/* Traduce una clave y sustituye los marcadores:
   {nombre} por el valor de vars.nombre, y {nombre|singular|plural} según ese valor (1 = singular). */
function t(key, vars){
  let s = (TEXTS[LANG] && TEXTS[LANG][key]) || TEXTS.en[key] || key;
  if (vars){
    s = s.replace(/\{(\w+)\|([^|}]*)\|([^}]*)\}/g, (m, k, one, many) =>
      vars[k] === undefined ? m : (Number(vars[k]) === 1 ? one : many));
    for (const k in vars) if (vars[k] !== undefined) s = s.split('{' + k + '}').join(vars[k]);
  }
  return s;
}

/* Campo localizado: los campos en inglés no llevan sufijo ('label'), los de español sí ('label_es'). */
function L(obj, field){
  return (LANG === 'es' && obj[field + '_es'] != null) ? obj[field + '_es'] : obj[field];
}

if (typeof module !== 'undefined') module.exports = { TEXTS, t, L };