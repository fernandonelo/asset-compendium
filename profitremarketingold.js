/* OPT-ZZZZZ START (v6.0.0-one • last-checkout-wins, control/variant fidelity, full cleanup/revert) */
((self) => {
  'use strict';

  // ====== LOGGING ======
  const VERSION = '6.0.0-one';
  const DEBUG   = false;
  const TAG     = `[%cRMKT ONE v${VERSION}%c]`;
  const v = (step, msg, data) => { if (DEBUG) console.log(`${TAG} ${step}`, 'color:#10B981;font-weight:bold;', 'color:inherit;', msg, data ?? ''); };

  // ====== TEST + SHARED KEYS ======
  const SELF_ID        = 'one';
  const LAST_FLAG_KEY  = 'rmkt_last_checkout_owner_v3'; // shared with Pro & Ultra

  // ====== INSIDER CONFIG (use your real IDs) ======
  const builderId   = Insider.browser.isDesktop() ? 10152 : 10156; 
  let variationId   = null;
  let isControl     = false;

  // ====== ROUTES & URLS ======
  const PRODUTOS_PATH = '/produtos';
  const CHECKOUT_PATH = '/produtos/profit-one/assinar';
  const CHECKOUT_URL  = 'https://www.nelogica.com.br/produtos/profit-one/assinar?planId=5417&planModeId=42373'; // TODO: add planId/planModeId if needed

  // ====== BANNER (Profit One) ======
  const IMG_SELECTOR   = 'img.devices';
  const ONE_BANNER     = 'https://downloadserver-cdn.nelogica.com.br/content/site/remarketing/Banner-Site-One.png';
  const ONE_BANNER_VER = `${ONE_BANNER}?one_v600=${Date.now().toString().slice(0,10)}`;
  const DATA_OWNER     = 'rmktOwner';
  const DATA_ORIGSRC   = 'rmktOrigSrc';

  // ====== CTA / CSS ======
  const classes = {
    style:        `ins-custom-style-${ builderId }`,
    customButton: `ins-custom-button-${ builderId }`,
    customHide:   `ins-custom-hide-${ builderId }`,
    goal:         `sp-custom-${ builderId }-1`,
  };
  const selectors = {
    customButton: `.${classes.customButton}`,
    customHide:   `.${classes.customHide}`,
    buttonsContainer: '.buttons-container',
    targetButton:     '.buttons-container a[href="/corretoras"]',
  };

  // ====== UTM / COOKIE ======
  const utmParamKey   = 'utm_track';
 const UTM_TRACK = isControl ? 'pr25_one_control' : 'pr25_one_variant';
  const gtmCookieName = '__gtm_campaign_url';
  const cookieDomain  = '.nelogica.com.br';

  // ====== LAST-OWNER TTL (7 days; remove check to make it indefinite) ======
  const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

  // ====== HELPERS ======
  const now = () => Date.now();
  const isOnPath = (p) => location.pathname.startsWith(p);

  const setLastCheckoutOwner = (owner) => {
    try { localStorage.setItem(LAST_FLAG_KEY, JSON.stringify({ owner, ts: now() })); } catch {}
    v('S19', 'Set last owner', { owner });
  };
  const getValidLastOwner = () => {
    try {
      const raw = localStorage.getItem(LAST_FLAG_KEY);
      if (!raw) return '';
      const { owner, ts } = JSON.parse(raw);
      return ts > 0 && (now() - ts) <= EXPIRY_MS ? owner : '';
    } catch { return ''; }
  };

  const forceUrlParam = (key, value) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(key, value);
      window.history.replaceState({}, '', url.toString());
      v('S10', 'forceUrlParam', { key, value });
    } catch (e) { v('S11', 'forceUrlParam error', e); }
  };

  const CARRY_KEYS = /^(utm_|gclid|fbclid|msclkid|gad_source|gbraid|wbraid)$/i;
  const carryParamsFromPage = () => {
    const carry = new URLSearchParams();
    try {
      const cur = new URL(location.href);
      cur.searchParams.forEach((v, k) => { if (CARRY_KEYS.test(k)) carry.set(k, v); });
    } catch {}
    return carry;
  };
  const updateGtmCookieWithUtmTrack = (utmTrackValue) => {
    let utms = {};
    try {
      const cookie = document.cookie.split('; ').find(c => c.startsWith(`${gtmCookieName}=`));
      if (cookie) {
        const decoded = decodeURIComponent(cookie.split('=')[1]);
        const query = decoded.split('?')[1];
        if (query) new URLSearchParams(query).forEach((v,k) => utms[k] = v);
      }
    } catch {}
    carryParamsFromPage().forEach((v, k) => { utms[k] = v; });
    utms[utmParamKey] = utmTrackValue;

    const newQuery  = new URLSearchParams(utms).toString();
    const fullValue = encodeURIComponent(`${window.location.origin}?${newQuery}`);
    const secure    = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${gtmCookieName}=${fullValue}; path=/; domain=${cookieDomain}; SameSite=Lax${secure}`;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'utm_campaign_cookie_updated', utm_track: utmTrackValue, rmkt_test: SELF_ID });
    v('S17', 'GTM cookie + dataLayer', { utmTrackValue });
  };

  const ensureVariation = (cb) => {
    let tries = 0, max = 80, delay = 50;
    (function tick(){
      try {
        variationId = Insider.campaign.userSegment.getActiveVariationByBuilderId(builderId);
        if (variationId) {
          isControl = Insider.campaign.isControlGroup(variationId);
          return cb(true);
        }
      } catch {}
      if (++tries <= max) return setTimeout(tick, delay);
      v('S32', 'variation NOT resolved — abort');
      cb(false);
    })();
  };

  // ====== UI: cleanup, revert, apply ======
  const ensureButtonsCSS = () => {
    if (document.querySelector(`style.${classes.style}`)) return;
    const css = `
      ${selectors.customButton}{
        border:1px solid #FFF;color:#FFF;background:transparent;
        display:flex;align-items:center;justify-content:center;
        border-radius:4px;padding:16px 0;height:52px;max-width:280px;width:100%;
        font-size:18px;font-weight:500;cursor:pointer;text-decoration:none
      }
      ${selectors.customHide}{ display:none !important; }
    `;
    const style = document.createElement('style');
    style.className = classes.style;
    style.textContent = css;
    document.head.appendChild(style);
  };

  const revertBannerToOriginal = () => {
    let count = 0;
    document.querySelectorAll(IMG_SELECTOR).forEach(img => {
      const orig = img.dataset[DATA_ORIGSRC];
      if (orig && img.src !== orig) { img.src = orig; count++; }
      delete img.dataset[DATA_OWNER];
    });
    v('S41', 'Banner reverted to original', { revertedCount: count });
  };

  const swapBannerToOne = () => {
    let count = 0;
    document.querySelectorAll(IMG_SELECTOR).forEach(img => {
      if (!img.dataset[DATA_ORIGSRC]) img.dataset[DATA_ORIGSRC] = img.src;
      img.src = ONE_BANNER_VER;
      img.dataset[DATA_OWNER] = SELF_ID;
      count++;
    });
    v('S42', 'Banner set to ONE', { swappedCount: count, ONE_BANNER_VER });
  };

  const removeCustomCTAsAnyTest = (container) => {
    if (!container) return 0;
    let removed = 0;
    container.querySelectorAll('a,button').forEach(el => {
      const hasInsCTA = [...(el.classList||[])].some(c => c.startsWith('ins-custom-button-'));
      if (hasInsCTA) { el.remove(); removed++; }
    });
    return removed;
  };

  const unhideNativeButtons = (container) => {
    if (!container) return 0;
    let touched = 0;
    container.querySelectorAll('a,button').forEach(el => {
      [...(el.classList||[])].forEach(c => {
        if (c.startsWith('ins-custom-hide-')) { el.classList.remove(c); touched++; }
      });
    });
    return touched;
  };

  const hideOtherButtons = (container) => {
    if (!container) return;
    container.querySelectorAll('a,button').forEach(el => {
      if (!el.classList.contains(classes.customButton)) el.classList.add(classes.customHide);
    });
  };

  const injectOneCTA = () => {
    ensureButtonsCSS();
    const container = document.querySelector(selectors.buttonsContainer);
    if (!container) { v('S42a', 'CTA container NOT found'); return; }

    // Clean any other test CTAs first
    removeCustomCTAsAnyTest(container);

    // Inject ours if not present
    if (!container.querySelector(selectors.customButton)) {
      const a = document.createElement('a');
      a.className = `${classes.customButton} ${classes.goal}`;
      const href = new URL(CHECKOUT_URL, location.origin);
      href.searchParams.set(utmParamKey, UTM_TRACK);
      a.href = href.toString();
      a.rel = 'noopener';
      a.textContent = 'Garanta o Profit One';
      const primary = container.querySelector(selectors.targetButton);
      if (primary) primary.insertAdjacentElement('afterend', a);
      else container.appendChild(a);
      v('S43', 'ONE CTA injected', { href: a.href });
    }

    hideOtherButtons(container);
    setTimeout(() => hideOtherButtons(container), 0);
  };

  const cleanupForControl = () => {
    revertBannerToOriginal();
    const container = document.querySelector(selectors.buttonsContainer);
    const removed = removeCustomCTAsAnyTest(container);
    const unhidden= unhideNativeButtons(container);
    v('S44', 'Control cleanup', { removedCTAs: removed, unhiddenButtons: unhidden });
  };

  // ====== IMPACT ======
  const impactNow = () => {
    // For ONE, you requested a single UTM ("pr25") for both arms
    forceUrlParam(utmParamKey, UTM_TRACK);
    updateGtmCookieWithUtmTrack(UTM_TRACK);

    try { Insider.campaign.custom.show(variationId); } catch {}

    if (isControl) {
      cleanupForControl();
    } else {
      swapBannerToOne();
      injectOneCTA();
    }
  };

  // ====== ROUTER ======
  const onRouteChange = () => {
    v('S60', 'route', { path: location.pathname });

    // Opening ONE checkout marks winner
    if (isOnPath(CHECKOUT_PATH)) { setLastCheckoutOwner(SELF_ID); return; }

    // Only act on /produtos
    if (!isOnPath(PRODUTOS_PATH)) return;

    // Only proceed if ONE is last owner
    const winner = getValidLastOwner();
    v('S61', 'winner?', { winner });
    if (winner !== SELF_ID) return;

    ensureVariation((ok) => { if (ok) impactNow(); });
  };

  // ====== SPA HOOKS & INIT ======
  const patchHistory = () => {
    const _ps = history.pushState;
    history.pushState = function () { const r = _ps.apply(this, arguments); setTimeout(onRouteChange, 0); return r; };
    addEventListener('popstate', onRouteChange);
    addEventListener('hashchange', onRouteChange);
  };

  self.init = () => { v('S01', 'INIT'); onRouteChange(); patchHistory(); v('S02', 'READY'); };
  return self.init();
})({});
/* OPT-ZZZZZ END */
