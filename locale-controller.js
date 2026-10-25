(() => {
  'use strict';
  const rules = window.BangingoLocaleRules;
  const key = 'bangingo-river-v2-language';
  const browserLocale = rules.browser(navigator.languages || [navigator.language]);
  let saved = null;
  try { saved = localStorage.getItem(key); } catch {}
  let state = {locale:rules.supported.includes(saved)?saved:browserLocale, mode:rules.supported.includes(saved)?'manual':'auto', source:rules.supported.includes(saved)?'manual':'browser',country:null};
  let detected = null, request = null;
  const listeners = new Set();
  function notify() {
    document.documentElement.dataset.languageMode = state.mode;
    document.documentElement.dataset.languageSource = state.source;
    document.documentElement.dataset.languageCountry = state.country || '';
    listeners.forEach(callback => callback({...state}));
  }
  async function detect() {
    if (request) return request;
    request = (async () => {
      const abort = new AbortController(), timeout = setTimeout(() => abort.abort(),2200);
      try {
        const response = await fetch('/api/locale',{cache:'no-store',credentials:'same-origin',signal:abort.signal});
        if (!response.ok) return;
        const result = await response.json();
        if (!rules.supported.includes(result.locale)) return;
        detected = {locale:result.locale,country:result.country || null,source:result.source==='country'?'country':'browser'};
        if (state.mode === 'auto') { state = {...state,...detected}; notify(); }
      } catch { /* Keep the usable browser-language fallback on a failed geo request. */ }
      finally { clearTimeout(timeout); request = null; }
    })();
    return request;
  }
  function choose(value) {
    if (value === 'auto') {
      try { localStorage.removeItem(key); } catch {}
      state = {mode:'auto',...(detected || {locale:browserLocale,country:null,source:'browser'})};
      notify(); detect();
    } else if (rules.supported.includes(value)) {
      try { localStorage.setItem(key,value); } catch {}
      state = {...state,locale:value,mode:'manual',source:'manual'}; notify();
    }
  }
  function subscribe(callback) { listeners.add(callback); callback({...state}); return () => listeners.delete(callback); }
  function bind(select) {
    if (!select) return;
    const option = document.createElement('option'); option.value='auto'; select.prepend(option);
    select.addEventListener('change',event=>choose(event.target.value));
    subscribe(current=>{option.textContent='AUTO · '+current.locale.toUpperCase();select.value=current.mode==='auto'?'auto':current.locale;});
  }
  window.BangingoLanguage = {get current(){return {...state};},choose,subscribe,bind};
  notify();
  if(state.mode==='auto')detect();
})();
