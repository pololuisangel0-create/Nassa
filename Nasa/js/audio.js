/* audio.js — efectos de sonido y música ambiental del puesto.
   Sonidos: Kenney (CC0). Música: Mixkit Free License (ver README).
   Los navegadores bloquean el audio hasta un gesto del usuario: la música
   arranca en el primer clic o tecla. Las preferencias se guardan en localStorage. */
const NassaAudio = (() => {
  const BASE = 'assets/audio/';
  // [archivo, volumen] — el clic va bajo para no cansar
  const SFX = {
    click:   ['click.mp3', .30],
    confirm: ['confirm.mp3', .55],
    alert:   ['alert.mp3', .60],
    harvest: ['harvest.mp3', .50],
    win:     ['victory.mp3', .65], // música nueva de victoria (añadir el archivo en assets/audio)
    fail:    ['win.mp3', .60],     // el antiguo sonido de victoria pasa a derrota
  };
  const read = (k, def) => {
    try { const v = localStorage.getItem(k); return v === null ? def : v === '1'; }
    catch (e) { return def; }
  };
  const write = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} };

  let sfxOn = read('nassa.sfx', true);
  let musicOn = read('nassa.music', true);
  let musicStarted = false;
  let labels = { musicOn: 'Music on', musicOff: 'Music off', sfxOn: 'Sound effects on', sfxOff: 'Sound effects off' };
  const cache = {};

  const music = new Audio(BASE + 'ambient.mp3');
  music.loop = true;
  music.volume = .16;
  music.preload = 'auto';

  // Los efectos son cortos: se precargan para que el primer clic no llegue tarde.
  Object.keys(SFX).forEach(name => {
    const a = new Audio(BASE + SFX[name][0]);
    a.preload = 'auto';
    cache[name] = a;
  });

  function play(name){
    const s = SFX[name];
    if (!sfxOn || !s) return;
    const a = cache[name];
    a.volume = s[1];
    try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {}
  }

  function startMusic(){
    if (musicStarted) return;
    musicStarted = true;
    if (musicOn) music.play().catch(() => {});
  }

  function sync(){
    const m = document.getElementById('musicBtn');
    const s = document.getElementById('sfxBtn');
    if (m){
      m.setAttribute('aria-pressed', String(musicOn));
      m.classList.toggle('off', !musicOn);
      m.setAttribute('aria-label', musicOn ? labels.musicOff : labels.musicOn);
      m.title = musicOn ? labels.musicOff : labels.musicOn;   // el título dice qué hace el clic
    }
    if (s){
      s.setAttribute('aria-pressed', String(sfxOn));
      s.classList.toggle('off', !sfxOn);
      s.setAttribute('aria-label', sfxOn ? labels.sfxOff : labels.sfxOn);
      s.title = sfxOn ? labels.sfxOff : labels.sfxOn;
    }
  }

  function toggleMusic(){
    musicOn = !musicOn;
    if (musicOn){ musicStarted = true; music.play().catch(() => {}); }
    else music.pause();
    write('nassa.music', musicOn);
    sync();
  }

  function toggleSfx(){
    sfxOn = !sfxOn;
    write('nassa.sfx', sfxOn);
    sync();
  }

  const mBtn = document.getElementById('musicBtn');
  const sBtn = document.getElementById('sfxBtn');
  if (mBtn) mBtn.onclick = toggleMusic;
  if (sBtn) sBtn.onclick = toggleSfx;

  ['pointerdown', 'keydown'].forEach(ev =>
    window.addEventListener(ev, startMusic, { once: true, passive: true }));

  sync();

  return {
    play,
    startMusic,
    toggleMusic,
    toggleSfx,
    isMusicOn: () => musicOn,
    isSfxOn: () => sfxOn,
    setLabels(next){ labels = Object.assign(labels, next); sync(); },
  };
})();
