/* ═══════════════════════════════════════════════
   SafeHer — Feature 16: Multilingual UI
   Supports: English (en), Hindi (hi), Telugu (te)
   Uses data-i18n attributes on HTML elements
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';
  console.log('[I18n] Module loading...');

  const I18n = {
    currentLang: 'en',
    translations: {},
    supportedLangs: ['en', 'hi', 'te'],
    langNames: { en: 'English', hi: 'हिन्दी', te: 'తెలుగు' },

    async loadLanguage(lang) {
      try {
        if (this.translations[lang]) return this.translations[lang];
        console.log('[I18n] Loading language:', lang);
        const resp = await fetch('assets/i18n/' + lang + '.json');
        if (!resp.ok) { console.warn('[I18n] Failed to load', lang); return null; }
        const data = await resp.json();
        this.translations[lang] = data;
        console.log('[I18n] ✅ Loaded', lang, '— keys:', Object.keys(data).length);
        return data;
      } catch (err) {
        console.error('[I18n] loadLanguage() error:', err);
        return null;
      }
    },

    async setLanguage(lang) {
      try {
        if (!this.supportedLangs.includes(lang)) {
          console.warn('[I18n] Unsupported language:', lang);
          return;
        }

        const data = await this.loadLanguage(lang);
        if (!data) return;

        this.currentLang = lang;
        localStorage.setItem('safeher_lang', lang);
        document.documentElement.setAttribute('lang', lang);
        this.applyTranslations(data);

        const picker = document.getElementById('lang-picker');
        if (picker) picker.value = lang;

        console.log('[I18n] ✅ Language set to:', lang);
      } catch (err) {
        console.error('[I18n] setLanguage() error:', err);
      }
    },

    applyTranslations(data) {
      try {
        document.querySelectorAll('[data-i18n]').forEach(el => {
          const key = el.getAttribute('data-i18n');
          if (data[key]) {
            if (el.tagName === 'INPUT' && el.type !== 'submit') {
              el.placeholder = data[key];
            } else {
              el.textContent = data[key];
            }
          }
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
          const key = el.getAttribute('data-i18n-title');
          if (data[key]) el.title = data[key];
        });

        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
          const key = el.getAttribute('data-i18n-aria');
          if (data[key]) el.setAttribute('aria-label', data[key]);
        });

        console.log('[I18n] Translations applied');
      } catch (err) {
        console.error('[I18n] applyTranslations() error:', err);
      }
    },

    getCurrentLang() { return this.currentLang; },

    t(key) {
      try {
        const data = this.translations[this.currentLang];
        return (data && data[key]) || key;
      } catch (_) { return key; }
    },

    init() {
      try {
        const picker = document.getElementById('lang-picker');
        if (picker) {
          picker.addEventListener('change', (e) => { this.setLanguage(e.target.value); });
        }

        const saved = localStorage.getItem('safeher_lang') || 'en';
        this.setLanguage(saved);

        console.log('[I18n] ✅ Module initialized');
      } catch (err) {
        console.error('[I18n] init() error:', err);
      }
    }
  };

  window.I18n = I18n;
})();
