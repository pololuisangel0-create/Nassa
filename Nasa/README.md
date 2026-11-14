# Junior Astronaut Mission Trainer — Mars Outpost (retro 2D prototype)

Entry for the NASA Space Apps Challenge **"Build a Junior Astronaut Mission Trainer"**.
Target audience: kids 7–12. Plain language, one screen, no download, no account.

## Run it

Open `index.html` in any browser. That's it — no build, no server.
(Runs offline too; the retro font falls back to monospace without internet.)

Dev check: `node js/game.js` runs engine self-tests (balance + no-NaN + "no free choices").

## How it plays

- Survive **30 sols** (a sol is one Martian day, 24h 37m) keeping three bars healthy.
- **3 core resources:** POWER, OXYGEN, SHIELD — there is no crew bar; the crew lives or dies with these three.
- **You can lose three ways:** oxygen hits 0 · power stays at 0 for two dark nights (life support shuts down) · an unshielded solar storm destroys your oxygen gear permanently (the blue bar's dark cap shows the lost capacity).
- Each sol pick up to 2 actions. **Every action costs a different resource** — saving power today can cost oxygen tomorrow. There is no free choice.
- Every 4 sols, space weather strikes using **real NASA solar-storm records**: a real flare/CME with its real date. Strong shield absorbs it; weak shield damages the oxygen equipment forever.
- Dust storms (real Mars science) cut solar power for 2 sols.
- Science scans pay out **2 sols later** — Mars radio delay is real (4–24 min one-way on Mars, compressed for play).

## Language

Toggle **ES / EN** in the header — English is the default, the choice persists (localStorage).
Every string, log entry and the "What's real?" panel switch instantly.

## Folder structure

```
index.html            game page (canvas scene + HUD + log + attribution)
css/style.css         retro styling
js/i18n.js            EN/ES text dictionary + language helpers
js/data.js            curated real NASA data (DONKI events, RadLab reading, facts)
js/game.js            pure engine (node-testable) + browser UI
assets/sprites/       16×16 pixel-art SVG sprites (sun, flare, hab, solar, rover)
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
   labeled as real archive data in-game). Live DONKI fetch with graceful fallback is the next step.
3. **Mars environmental science** — global dust storms (2018 storm ended Opportunity) and the
   4–24 minute one-way Earth–Mars radio delay are documented NASA mission facts.

## Swapping in your own sprites later

Drop pixel-art PNGs into `assets/sprites/` with the same names (`sun`, `flare`, `hab`, `solar`,
`rover`). The loader draws each at 4× scale assuming 16×16 art; adjust the scale in
`drawSprite()` calls in `js/game.js` if your art is bigger.

## Roadmap (add/fix later)

- Live DONKI fetch (with curated fallback), more event types (RadLab BLEO doses beyond LEO),
  sound effects, animations, bilingual ES/EN, classroom mode for older siblings/parents.

Not endorsed by NASA.
