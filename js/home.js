/* =====================================================================
   HOME — product landing for Company A (A-Bolaget)
   Two workspaces: dispatcher Control Tower · customer delivery tracker
   ===================================================================== */

const Home = {
  mount() {
    const root = $('#home-root');
    if (!root) return;
    const quick = ['SE-1042', 'SE-1051', 'SE-2031', 'SE-3061'];

    root.innerHTML = `
    <div class="landing">
      <header class="land-head">
        <div class="land-kicker">A-BOLAGET · SWEDEN FULFILLMENT CONTROL TOWER</div>
        <h1>${T('landTitleA')}<br><span class="grad">${T('landTitleB')}</span></h1>
        <p class="land-sub">${T('landSub')}</p>
      </header>

      <div class="role-cards">
        <div class="role-card">
          <div class="rc-ico rc-dispatch">&#128228;</div>
          <h3>${T('forDispatch')}</h3>
          <p>${T('forDispatchSub')}</p>
          <a class="btn btn-primary" href="#/tower">${T('openTower')}</a>
        </div>

        <div class="role-card">
          <div class="rc-ico rc-customer">&#128230;</div>
          <h3>${T('forCustomer')}</h3>
          <p>${T('forCustomerSub')}</p>
          <div class="track-form">
            <input id="land-track-input" placeholder="${T('trackPlaceholder')}" value="SE-1042" spellcheck="false" aria-label="${T('trackPlaceholder')}">
            <button id="land-track-btn" class="btn btn-primary">${T('btnTrack')}</button>
          </div>
          <div class="rc-quick">
            <span>${T('quickOpen')}</span>
            ${quick.map(id => `<button data-open="${id}">${id}</button>`).join('')}
          </div>
        </div>

        <div class="role-card">
          <div class="rc-ico rc-mgmt">&#128202;</div>
          <h3>${T('forMgmt')}</h3>
          <p>${T('forMgmtSub')}</p>
          <div class="mkt-mini">&#9679; ${T('mktMini')}</div>
          <a class="btn btn-ghost" href="#/markets">${T('roBtn')}</a>
        </div>
      </div>

      <footer class="land-foot">${T('footNote')}</footer>
    </div>`;

    const input = root.querySelector('#land-track-input');
    const go = v => {
      const code = (v || '').trim().toUpperCase();
      if (State.orders.find(o => o.id === code)) location.hash = '#/track/' + code;
      else toast(T('toastNotFound'));
    };
    root.querySelector('#land-track-btn').addEventListener('click', () => go(input.value));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(input.value); });
    root.querySelectorAll('[data-open]').forEach(b =>
      b.addEventListener('click', () => { location.hash = '#/track/' + b.dataset.open; }));
  },
};
