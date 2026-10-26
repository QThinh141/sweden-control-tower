# A-Bolaget · Sweden Fulfillment Control Tower 🗼

**Netcompany PULSE + ORTEC / Optrack Integration for Swedish Last-Mile Excellence**
Product website — IT Consultant Challenge 2026, Round 1 · **Team Triple TTT**

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

## The product (4 workspaces)

| Workspace | What it does |
|---|---|
| **Landing (`#/`)** | Choose your workspace — dispatcher Control Tower, customer delivery tracker (order-code lookup), or management rollout status |
| **Control Tower (`#/tower`)** | Dispatcher workspace — live risk dashboard with ETA re-scoring, ORTEC recommendations (probability + cost impact), one-click interventions, live map of Stockholm · Göteborg · Malmö, intervention feed, route load (Optrack) |
| **Nordic Rollout (`#/markets`)** | The scale path as a product feature — live Nordic map (Sweden live, Norway Q2 2027, Denmark Q3 2027) + the 4-phase rollout plan with live stats pulled from the running system |
| **Customer Portal (`#/track/SE-1042`)** | The SMS-link experience — no app, no login: live status, ETA, self-service re-booking, SMS thread |

## Languages 🌍

The full product UI is localized in **5 languages**: **English · Tiếng Việt · Svenska · Dansk · Norsk** —
switch via the selector in the top bar (or the 🌐 button in the customer's phone).
Your choice is remembered. System/event logs remain in English (back-office realism).

## Walkthrough (60 seconds)

1. **Landing** → pick a workspace (or type an order code as a customer).
2. **Control Tower** — 6 routes, 16 orders, KPIs live. Click a red/amber row → drawer shows **ORTEC recommendations** → **Execute** → order turns SAVED, SMS sent, "Saved today" +1.
3. Press **⚠ Traffic incident** (E4 Södertälje) or **🔧 Vehicle breakdown** (TRK-118) → watch ETAs re-score in real time.
4. Click **↗** on any row (or "Open customer view") → see the same order as the customer sees it — re-book a new slot in 10 seconds.
5. The tower feed shows: *"Customer re-booked via SMS link — zero dispatcher time."*

## Customising

- **Orders / routes / feed events**: `ORDER_SEED`, `GEO.routes`, `FEED_POOL` in `js/data.js`.
- **UI strings (5 languages)**: the `STR` dictionary in `js/data.js`.
- **Colours / theme**: CSS variables at the top of `styles.css` (light Nordic theme).

## Structure

```
index.html      — app shell (landing + 3 workspaces)
styles.css      — design system (light theme)
js/data.js      — simulated data, STR i18n dictionary, recommendation engine
js/core.js      — state, T() translation, simulation loop, Sweden map, router
js/home.js      — landing page (workspace chooser + order lookup)
js/tower.js     — Control Tower workspace
js/markets.js   — Nordic rollout view (scale path as a product feature)
js/customer.js  — Customer portal (SMS-link experience)
```

## Deployment (GitHub Pages)

This repository is deployed automatically via GitHub Pages from the `main` branch root:

```bash
git add . && git commit -m "Update" && git push
# Pages redeploys in ~1 minute → https://qthinh141.github.io/sweden-control-tower/
```
