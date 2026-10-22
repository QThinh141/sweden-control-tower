# Sweden Fulfillment Control Tower 🗼

**Netcompany PULSE + ORTEC / Optrack Integration for Swedish Last-Mile Excellence**
Interactive MVP prototype — IT Consultant Challenge 2026, Round 1 · **Team Triple TTT**

All orders, vehicles, events and KPIs on this site are **simulated** for demonstration.

🌐 **Live site:** https://qthinh141.github.io/sweden-control-tower/

---

## How to run

No build step, no dependencies. Either:

1. **Double-click `index.html`** (works offline — fonts fall back to system fonts), or
2. Serve it locally:

```bash
python -m http.server 8642 --directory .
# then open http://localhost:8642
```

## Languages 🌍

The product UI (Control Tower + Customer Portal) is fully localized in **5 languages**:
**English · Tiếng Việt · Svenska · Dansk · Norsk** — switch via the selector in the top bar
(or the 🌐 button inside the customer's phone). Your choice is remembered.
*The pitch page stays in English (submission language); system/event logs remain in English (back-office realism).*

## What's inside

| View | What it demonstrates |
|---|---|
| **Pitch (`#/`)** | The full consultant proposal: challenge, prioritisation (Sweden first), 3-layer architecture (PULSE → ORTEC → Optrack), MVP scope (in/out), AI value, business impact with stated assumptions, Nordic scale path |
| **Control Tower (`#/tower`)** | Dispatcher workspace — Risk Dashboard with live ETA re-scoring, ORTEC recommendations with success probability, one-click interventions, live map (Stockholm · Göteborg · Malmö), intervention feed, route load (Optrack) |
| **Customer Portal (`#/track/SE-1042`)** | The SMS-link experience — no app, no login: live status, ETA, self-service re-booking, SMS thread. Demo controls for the jury |

## Demo script (90 seconds)

1. Open the **live demo** — 6 routes, 16 orders, KPIs already moving.
2. Click a red/amber row → drawer shows **ORTEC recommendations** (probability + cost impact) → **Execute** → order turns SAVED, SMS sent, KPI "Saved today" +1.
3. Press **⚠ Traffic incident** (E4 Södertälje) or **🔧 Vehicle breakdown** (TRK-118) → watch ETAs re-score in real time.
4. Click **↗** on any row (or "Open customer view") → see the same order as the customer sees it — re-book a new slot in 10 seconds.
5. Back in the tower, the feed shows: *"Customer re-booked via SMS link — zero dispatcher time."*
6. Switch language to **Svenska / Dansk / Norsk / Tiếng Việt** — one product, every Nordic market.

## Customising

- **Team name**: edit `CONFIG.teamName` in `js/data.js`.
- **Orders / routes / feed events**: `ORDER_SEED`, `GEO.routes`, `FEED_POOL` in `js/data.js`.
- **UI strings (5 languages)**: the `STR` dictionary in `js/data.js`.
- **Colours / theme**: CSS variables at the top of `styles.css` (light Nordic theme).

## Structure

```
index.html      — app shell + pitch content
styles.css      — design system (light theme: tower + portal)
js/data.js      — simulated data, STR i18n dictionary, recommendation engine
js/core.js      — state, T() translation, simulation loop, Sweden map, router
js/tower.js     — Control Tower view
js/customer.js  — Customer portal view
```

## Deployment (GitHub Pages)

This repository is deployed automatically via GitHub Pages from the `main` branch root:

```bash
git add . && git commit -m "Update prototype" && git push
# Pages redeploys in ~1 minute → https://qthinh141.github.io/sweden-control-tower/
```
