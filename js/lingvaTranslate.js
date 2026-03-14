/* ═══════════════════════════════════════════════
   SafeHer — Feature 8: Lingva Translate
   Free, open-source translation API — no API key needed.
   Adds dynamic translation for UI text and SOS alerts.
   Public instances tried in order until one responds.
   ═══════════════════════════════════════════════ */

const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://lingva.garudalinux.org',
  'https://lingva.lunar.icu'
];

const translationCache = new Map(); // cache to avoid repeat API calls

/**
 * translateText(text, targetLang, sourceLang)
 * Translate a string using Lingva API (tries multiple instances).
 * Falls back to original text if all instances fail.
 */
export async function translateText(text, targetLang, sourceLang = 'en') {
  if (!text || !text.trim() || targetLang === sourceLang) return text;

  const cacheKey = `${sourceLang}-${targetLang}-${text}`;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const encodedText = encodeURIComponent(text);

  // Try each instance in order until one works
  for (const instance of LINGVA_INSTANCES) {
    try {
      const url = `${instance}/api/v1/${sourceLang}/${targetLang}/${encodedText}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (response.ok) {
        const data = await response.json();
        const translated = data.translation;
        if (translated) {
          translationCache.set(cacheKey, translated);
          console.log('[Lingva] ✅ Translated to', targetLang, ':', text.substring(0, 30), '→', translated.substring(0, 30));
          return translated;
        }
      }
    } catch (error) {
      continue; // try next instance
    }
  }

  // All instances failed — return original text
  console.warn('[Lingva] Translation failed for all instances, returning original');
  return text;
}

/**
 * translateSOSMessage(message, targetLang)
 * Translate an SOS message, preserving URLs and coordinates.
 */
export async function translateSOSMessage(message, targetLang) {
  if (!targetLang || targetLang === 'en') return message;
  return await translateAlertEmailBody(message, targetLang);
}

/**
 * SUPPORTED_LANGUAGES
 * Extended list of languages beyond the base en/hi/te.
 */
export const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'hi': 'Hindi',
  'te': 'Telugu',
  'ta': 'Tamil',
  'bn': 'Bengali',
  'mr': 'Marathi',
  'gu': 'Gujarati',
  'kn': 'Kannada',
  'ml': 'Malayalam',
  'pa': 'Punjabi',
  'ur': 'Urdu',
  'or': 'Odia',
  'as': 'Assamese',
  'ne': 'Nepali',
  'si': 'Sinhala',
  'ar': 'Arabic',
  'fr': 'French',
  'de': 'German',
  'es': 'Spanish',
  'pt': 'Portuguese'
};

/**
 * translateAlertEmailBody(emailBody, targetLang)
 * Translates an SOS email body line-by-line, skipping URLs,
 * coordinates, and empty lines.
 */
export async function translateAlertEmailBody(emailBody, targetLang) {
  if (!targetLang || targetLang === 'en') return emailBody;

  const lines = emailBody.split('\n');
  const translated = await Promise.all(lines.map(async (line) => {
    // Don't translate GPS coordinates, URLs, numbers-only lines, or empty lines
    if (
      line.match(/^https?:\/\//) ||
      line.match(/^\s*-?\d+\.\d+/) ||
      line.match(/^GPS Coordinates:/) ||
      line.match(/^Lat\s/) ||
      line.match(/^Lng\s/) ||
      line.match(/^\/\/\/\w+\.\w+\.\w+/) ||   // What3Words addresses
      line.trim() === '' ||
      line.match(/^<img\s/) ||                  // HTML image tags
      line.match(/^🔗/)                         // map links
    ) {
      return line;
    }
    try {
      return await translateText(line, targetLang);
    } catch (_) {
      return line;
    }
  }));

  return translated.join('\n');
}

/**
 * getTranslationLanguage()
 * Returns the user's selected language from localStorage/I18n.
 */
export function getTranslationLanguage() {
  if (window.I18n && window.I18n.getCurrentLang) {
    return window.I18n.getCurrentLang();
  }
  return localStorage.getItem('safeher_lang') || 'en';
}
