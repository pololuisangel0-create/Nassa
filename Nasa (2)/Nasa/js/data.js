/* Real NASA data curated for this game — sources and reasoning in README.md.
   DONKI web service (kauai.ccmc.gsfc.nasa.gov) was unreachable at build time;
   per the challenge brief, an embedded curated real dataset is the honest fallback. */

const DONKI_EVENTS = [
  { date:'2024-05-10', kind:'CME', label:'Gannon storm: giant solar eruption reaches Earth (G5)',
    label_es:'Tormenta Gannon: gran eyección solar llega a la Tierra (G5)',
    severity:9, note:'The strongest geomagnetic storm since 2003 — auroras seen around the world.',
    note_es:'La tormenta geomagnética más fuerte desde 2003 — auroras vistas en todo el mundo.' },
  { date:'2024-05-14', kind:'FLR', label:'X8.7 solar flare',
    label_es:'Fulguración solar X8.7',
    severity:9, note:'The strongest flare of Solar Cycle 25 so far.',
    note_es:'La fulguración más fuerte del Ciclo Solar 25 hasta ahora.' },
  { date:'2024-02-22', kind:'FLR', label:'X6.3 solar flare',
    label_es:'Fulguración solar X6.3',
    severity:8, note:'The strongest flare since 2017.',
    note_es:'La fulguración más fuerte desde 2017.' },
  { date:'2024-05-11', kind:'FLR', label:'X5.8 solar flare',
    label_es:'Fulguración solar X5.8',
    severity:7, note:'Part of the famous May 2024 storm week.',
    note_es:'Parte de la famosa semana de tormentas de mayo de 2024.' },
  { date:'2023-12-14', kind:'FLR', label:'X2.8 solar flare',
    label_es:'Fulguración solar X2.8',
    severity:5, note:'An X-class flare — the strongest flare class.',
    note_es:'Una fulguración de clase X — la clase de fulguración más fuerte.' },
];

/* Real reading fetched live from the RadLab Data API:
   https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&absorbed_dose_rate&flux&format=json */
const RADLAB = {
  instrument:'DosTel-1 dosimeter aboard the ISS',
  date:'2022-04-01T00:00Z',
  absorbed_dose_rate_uGy_per_h:1.997,
  flux:0.116,
  note:'Astronauts in orbit absorb about 2 microgray (μGy) of radiation every hour — roughly 100 times the dose people get on Earth.',
  note_es:'Los astronautas en órbita absorben unos 2 microgray (μGy) de radiación cada hora — unas 100 veces la dosis que se recibe en la Tierra.',
};

const REAL_FACTS = {
  dust:'🌪 Mars dust storms are real: in 2018 a global dust storm hid the Sun for months and ended the Opportunity rover mission (NASA).',
  dust_es:'🌪 Las tormentas de polvo en Marte son reales: en 2018 una tormenta global escondió el Sol durante meses y terminó la misión del rover Opportunity (NASA).',
  comm:'📡 Mars is so far away that radio messages take 4–24 minutes each way — nobody can chat with Mars in real time (NASA).',
  comm_es:'📡 Marte está tan lejos que los mensajes de radio tardan de 4 a 24 minutos en cada dirección — nadie puede conversar con Marte en tiempo real (NASA).',
};

if (typeof module !== 'undefined') module.exports = { DONKI_EVENTS, RADLAB, REAL_FACTS };