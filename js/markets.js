/* =====================================================================
   NORDIC ROLLOUT — the scale path as a product feature (#/markets)
   Sweden live (pulls real stats from the running system) ·
   Norway & Denmark planned with their market modules
   ===================================================================== */

const Markets = {
  /* ------------------------------------------------ Nordic map (SVG) */
  svgNordic() {
    const c = GEO.cities, d = GEO.dcs, dk = GEO.denmark;
    let s = '<svg viewBox="0 0 240 672" class="map-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Nordic rollout map">';
    s += '<defs><linearGradient id="landg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4eefb"/></linearGradient></defs>';

    /* planned lands (dashed, dimmed) */
    s += `<path class="map-plan-land" d="${GEO.norway}"/>`;
    s += `<path class="map-plan-land" d="${dk.jutland}"/>`;
    s += `<ellipse class="map-plan-land" cx="${dk.funen.cx}" cy="${dk.funen.cy}" rx="${dk.funen.rx}" ry="${dk.funen.ry}"/>`;
    s += `<path class="map-plan-land" d="${dk.zealand}"/>`;
    s += `<circle class="map-plan-land" cx="${dk.bornholm.cx}" cy="${dk.bornholm.cy}" r="${dk.bornholm.r}"/>`;

    /* live land — Sweden */
    s += `<path class="map-land-live" d="${GEO.sweden}"/>`;
    s += '<ellipse class="map-island" cx="160" cy="446" rx="8" ry="11"/><path class="map-island-s" d="M134 424 L137 442"/>';

    /* pilot metros on the live market */
    Object.values(c).forEach(k => { s += `<circle class="map-pilot" cx="${k.x}" cy="${k.y}" r="17"/>`; });
    Object.values(d).forEach(k => {
      s += `<rect class="map-dc" x="${k.x - 2.5}" y="${k.y - 2.5}" width="5" height="5"/>`;
    });
    Object.values(c).forEach(k => {
      s += `<g class="map-city"><circle class="city-pulse" cx="${k.x}" cy="${k.y}" r="9"/><circle class="city-core" cx="${k.x}" cy="${k.y}" r="3.6"/><text class="map-city-lbl" x="${k.lx}" y="${k.ly}" text-anchor="${k.anchor}">${k.label}</text></g>`;
    });

    /* country labels + rollout status */
    s += `<text class="np-country" x="104" y="180">SVERIGE</text>`;
    s += `<text class="np-status-live" x="104" y="194">${T('mapLive')}</text>`;
    s += `<text class="np-country" x="10" y="240">NORGE</text>`;
    s += `<text class="np-status-plan" x="10" y="254">Q2 2027</text>`;
    s += `<text class="np-country" x="58" y="648">DANMARK</text>`;
    s += `<text class="np-status-plan" x="58" y="662">Q3 2027</text>`;
    s += '</svg>';
    return s;
  },

  /* ------------------------------------------------ phase card */
  phase(num, cls, nameKey, whenKey, descKey, extra = '') {
    const status = cls === 'ph-live' ? T('phaseLive') : cls === 'ph-next' ? T('phaseNext') : T('phasePlanned');
    const stCls = cls === 'ph-live' ? 'st-live' : cls === 'ph-next' ? 'st-next' : 'st-plan';
    return `
    <div class="mk-phase ${cls}">
      <div class="mk-row">
        <span class="mk-num">${num}</span>
        <div class="mk-names"><b>${T(nameKey)}</b><span>${T(whenKey)}</span></div>
        <span class="mk-status ${stCls}">${status}</span>
      </div>
      <p>${T(descKey)}</p>
      ${extra}
    </div>`;
  },

  liveStats() {
    return `
      <span class="chip chip-green">&#9679; ${onTimePct().toFixed(1)}% ${T('onTime')}</span>
      <span class="chip chip-blue">&#9679; ${T('ordersLive', { n: activeOrders().length })}</span>
      <span class="chip chip-blue">&#9679; ${T('routesLive', { n: GEO.routes.length })}</span>
      <span class="chip chip-amber">&#9679; ${State.savedToday} ${T('kSaved').toLowerCase()}</span>`;
  },

  /* ------------------------------------------------ mount */
  mount() {
    const root = $('#markets-root');
    if (!root) return;
    root.innerHTML = `
    <div class="mk-wrap">
      <div class="tower-head">
        <div class="th-title">
          <h2>${T('rolloutTitle')}</h2>
          <div class="sub">${T('rolloutSub')}</div>
          <a class="back-link" href="#/">${T('tBack')}</a>
        </div>
        <div class="th-right">
          <span class="pl-chip"><i class="dot ok"></i>${T('mktChip')}</span>
        </div>
      </div>

      <div class="mk-grid">
        <section class="panel mk-map-panel">
          <div class="panel-head">
            <div><div class="panel-title">${T('netTitle')}</div><div class="panel-sub">${T('mktMini')}</div></div>
          </div>
          <div class="map-holder mk-map-holder">${this.svgNordic()}</div>
        </section>

        <section class="mk-phases">
          ${this.phase(1, 'ph-live', 'm1Name', 'm1When', 'm1Desc', `<div class="mk-chips" id="mk-live-stats">${this.liveStats()}</div>`)}
          ${this.phase(2, 'ph-next', 'm2Name', 'm2When', 'm2Desc')}
          ${this.phase(3, 'ph-plan', 'm3Name', 'm3When', 'm3Desc', `<span class="mk-module">${T('m3Mod')}</span>`)}
          ${this.phase(4, 'ph-plan', 'm4Name', 'm4When', 'm4Desc', `<span class="mk-module">${T('m4Mod')}</span>`)}
          <div class="mk-foot">&#127919; ${T('roFoot')}</div>
        </section>
      </div>
    </div>`;
  },

  /* ------------------------------------------------ periodic update */
  update() {
    if (State.view !== 'markets') return;
    const el = $('#mk-live-stats');
    if (el) el.innerHTML = this.liveStats();
  },
};
