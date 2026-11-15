# Junior Astronaut Mission Trainer — Mars Outpost (browser prototype)

Entry for the NASA Space Apps Challenge **"Build a Junior Astronaut Mission Trainer"**.
Target audience: kids 7–12. Plain language, one screen, no download, no account.

## Run it

Open `index.html` in any browser. That's it — no build, no server.
Works offline too: fonts and sounds are local files (Google Fonts is an optional enhancement;
without internet the page falls back to system fonts).

Dev check: `node js/game.js` runs engine self-tests (balance + no-NaN + "no free choices").

## How it plays

- Survive **30 sols** (a sol is one Martian day, 24h 37m) keeping four bars healthy.
- **4 core resources:** POWER, OXYGEN, SHIELD, FOOD.
- **Any bar at 0 when you end a sol = mission over.**
- Each sol you get **1 action**. Every action spends power (some also spend oxygen), so saving
  power today can cost oxygen tomorrow. There is no free choice.
- **Changed your mind? Click the highlighted action again to cancel it** and pick another
  (costs are refunded, the sol is not spent).
- **Grow Crops** plants food that ripens **3 sols later** — plan your harvests; the crew eats
  5 food every sol.
- Every **5 sols**, space weather strikes using **real NASA solar-storm records**: a real
  flare/CME with its real date. Enough shield absorbs it and loses that shield; not enough
  shield is lethal.
- Dust storms (real Mars science) cut solar recharge for **3–6 sols**.
- A warning panel opens **2 sols before** each event with the shield needed or the dust
  forecast, so there are no surprises.

## Interface and audio

The console is styled like a mission-control display: NASA blue/red palette, mission patch,
telemetry panels, live camera frame, low-resource alarms and bilingual technical labels.

Sound effects are triggered by actions, warnings, harvests and the end screen. The ambient
track starts on the first click or key press (browser autoplay rules) and loops. Use the 🎵 and
🔊 buttons in the header to toggle music and effects independently; both preferences persist in
`localStorage`.

### Audio credits

| File | Source | License |
|------|--------|---------|
| `click.mp3`, `confirm.mp3`, `alert.mp3`, `fail.mp3` | [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) | CC0 |
| `harvest.mp3` | [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio) (`handle_coins`) | CC0 |
| `win.mp3` | [Kenney Music Jingles](https://kenney.nl/assets/music-jingles) (8-bit jingle) | CC0 |
| `ambient.mp3` | "Vastness" by Andrew Ev — [Mixkit](https://mixkit.co/free-stock-music/) | [Mixkit Stock Music Free License](https://mixkit.co/license/#musicFree) |

All tracks were downloaded once, converted to MP3 and stored locally; the game never streams
audio at runtime.

## Language

Toggle **ES / EN** in the header — English is the default, the choice persists (localStorage).
Every string, log entry, panel label and the "What's real?" panel switch instantly.

## Folder structure

```
index.html            game page (canvas scene + HUD + log + attribution)
css/style.css         mission-console styling (NASA-inspired palette)
js/lang.js            EN/ES text dictionary + language helpers
js/data.js            curated real NASA data (DONKI events, RadLab reading, facts)
js/events.js          space weather deck, dust storms, forecasts, live DONKI fetch
js/stats-decisions.js resources, actions, crops and undo (pure state)
js/audio.js           sound effects + ambient music manager
js/game.js            pure engine (node-testable) + browser UI
assets/sprites/       pixel-art SVG sprites (sun, warning, hab, hab_crops, solar, rover)
assets/audio/         local MP3 sound effects + ambient track
assets/favicon.svg    mission patch favicon
README.md             this file
```

## Real NASA data used, and why

1. **NASA OSDR RadLab (radiation dosimetry)** — a real reading from a dosimeter aboard the ISS
   (`DosTel-1`, 2022-04-01, **1.997 μGy/hour**) calibrates the radiation/shield mechanic and is
   shown to players in the "What's real?" panel.
   `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&absorbed_dose_rate&flux&format=json`
2. **NASA DONKI (Space Weather Database)** — curated **real** events drive the game's radiation
   events (dates and severities are public records): Gannon storm G5 CME (2024-05-10), X8.7 flare
   (2024-05-14), X6.3 flare (2024-02-22), X5.8 flare (2024-05-11), X2.8 flare (2023-12-14).
   `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=...&endDate=...&api_key=DEMO_KEY`
   *Honesty note:* the DONKI web-service host was unreachable from our build environment, so the
   game ships with this **embedded curated real dataset** (explicitly allowed by the brief, and
   labeled as real archive data in-game). If the live API responds, the game swaps the deck
   automatically (`js/events.js`).
3. **Mars environmental science** — global dust storms (2018 storm ended Opportunity) and the
   4–24 minute one-way Earth–Mars radio delay are documented NASA mission facts.

## Balance

`CFG.INCOME` (solar recharge per sol) is tuned to **28** so the self-test's prudent strategy wins
roughly 70–80% of runs while careless play still fails. Change it in `js/stats-decisions.js` and
run `node js/game.js` to re-check the balance.

## Swapping in your own sprites later

Replace the files in `assets/sprites/` keeping the same names (`sun`, `warning`, `hab`, `hab_crops`,
`solar`, `rover`). Each sprite is drawn 1:1 on the 320×180 canvas, so its size must match
`SPRITE_SIZE` in `js/game.js`, and its position is set in `drawScene()`.
`hab_crops` is shown instead of `hab` while crops are growing; `warning` replaces `sun` during a solar storm.

## Roadmap (add/fix later)

- Live DONKI fetch quality (more event types, RadLab BLEO doses beyond LEO), animations,
  classroom mode for older siblings/parents.

Not endorsed by NASA.
