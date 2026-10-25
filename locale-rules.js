(function (root) {
  'use strict';
  const supported = ['pl','en','de','fr','es','it','pt','ar','ja','zh'];
  const groups = {
    pl:'PL', en:'GB IE US AU NZ CA', de:'DE AT LI', fr:'FR MC', es:'ES MX AR BO CL CO CR CU DO EC GT HN NI PA PE PR PY SV UY VE',
    it:'IT SM VA', pt:'PT BR AO MZ CV GW ST TL', ar:'AE SA EG JO LB SY IQ KW QA BH OM YE PS DZ LY TN SD', ja:'JP', zh:'CN TW HK MO'
  };
  const countries = {};
  Object.entries(groups).forEach(([language,list]) => list.split(' ').forEach(country => countries[country] = [language]));
  Object.assign(countries,{CH:['de','fr','it'],BE:['fr','de','en'],LU:['fr','de'],CA:['en','fr'],MA:['ar','fr'],DZ:['ar','fr'],TN:['ar','fr'],SG:['en','zh']});
  function browser(languages) {
    for (const value of languages || []) {
      const language = String(value).toLowerCase().split(/[-_;]/)[0].trim();
      if (supported.includes(language)) return language;
    }
    return 'en';
  }
  function country(code,languages) {
    const choices = countries[String(code || '').toUpperCase()];
    if (!choices) return browser(languages);
    const preferred = browser(languages);
    return choices.includes(preferred) ? preferred : choices[0];
  }
  const rules = {supported,browser,country};
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.BangingoLocaleRules = rules;
})(typeof globalThis === 'object' ? globalThis : this);
