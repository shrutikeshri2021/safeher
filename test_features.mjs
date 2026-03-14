/* ═══════════════════════════════════════════════
   SafeHer Feature Test Suite
   Tests all 9 new JS modules for correctness
   Run: node test_features.mjs
   ═══════════════════════════════════════════════ */

let pass = 0, fail = 0;
function assert(name, condition, detail) {
  if (condition) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

// ── Polyfill browser globals for Node ──
globalThis.window = globalThis;
globalThis.navigator = { geolocation: {}, connection: null, contacts: null };
globalThis.document = {
  readyState: 'complete',
  getElementById: () => null,
  addEventListener: () => {},
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, addEventListener: () => {}, appendChild: () => {} }),
  body: { appendChild: () => {} },
  documentElement: { setAttribute: () => {} }
};
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.sessionStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.fetch = async () => { throw new Error('network disabled in test'); };
globalThis.AbortSignal = { timeout: () => ({}) };
globalThis.screen = { orientation: null };

// ═══════════════════════════════════════════════
// FEATURE 1: IP Geolocation
// ═══════════════════════════════════════════════
console.log('\n═══ FEATURE 1: IP Geolocation ═══');
const ipGeo = await import('./js/ipGeolocation.js');

assert('1.1 getIPLocation is function', typeof ipGeo.getIPLocation === 'function');
assert('1.2 saveLastGPS is function', typeof ipGeo.saveLastGPS === 'function');
assert('1.3 getLastKnownGPS is function', typeof ipGeo.getLastKnownGPS === 'function');
assert('1.4 getLocationWithFallback is function', typeof ipGeo.getLocationWithFallback === 'function');
assert('1.5 formatLocationSource is function', typeof ipGeo.formatLocationSource === 'function');

// Test formatLocationSource
assert('1.6 GPS source returns empty string', ipGeo.formatLocationSource({ source: 'gps' }) === '');
assert('1.7 null location returns warning', ipGeo.formatLocationSource(null).includes('unavailable'));
assert('1.8 IP source mentions Approximate', ipGeo.formatLocationSource({ source: 'ip', city: 'Mumbai', region: 'MH', country: 'IN' }).includes('Approximate'));
assert('1.9 cached_gps mentions Last known', ipGeo.formatLocationSource({ source: 'cached_gps', cachedAt: '2025-01-01' }).includes('Last known'));

// Test saveLastGPS + getLastKnownGPS roundtrip
ipGeo.saveLastGPS(17.385, 78.4867);
const cached = ipGeo.getLastKnownGPS();
assert('1.10 saveLastGPS+getLastKnownGPS lat', cached && Math.abs(cached.lat - 17.385) < 0.001);
assert('1.11 saveLastGPS+getLastKnownGPS lng', cached && Math.abs(cached.lng - 78.4867) < 0.001);
assert('1.12 cached source is cached_gps', cached && cached.source === 'cached_gps');
assert('1.13 cached has timestamp', cached && cached.cachedAt !== undefined);

// Test getIPLocation fails gracefully (no network in test)
const ipResult = await ipGeo.getIPLocation();
assert('1.14 getIPLocation returns null on network error', ipResult === null);

// ═══════════════════════════════════════════════
// FEATURE 2: What3Words
// ═══════════════════════════════════════════════
console.log('\n═══ FEATURE 2: What3Words ═══');
const w3w = await import('./js/what3words.js');

assert('2.1 getWhat3Words is function', typeof w3w.getWhat3Words === 'function');
assert('2.2 formatW3WForAlert is function', typeof w3w.formatW3WForAlert === 'function');
assert('2.3 formatW3WForSMS is function', typeof w3w.formatW3WForSMS === 'function');

// Test with placeholder API key - should skip gracefully
const w3wResult = await w3w.getWhat3Words(17.385, 78.4867);
assert('2.4 Returns null when API key is placeholder', w3wResult === null);

// Test formatters with null
assert('2.5 formatW3WForAlert(null) returns empty', w3w.formatW3WForAlert(null) === '');
assert('2.6 formatW3WForSMS(null) returns empty', w3w.formatW3WForSMS(null) === '');

// Test formatters with valid data
const mockW3W = { words: 'filled.count.soap', link: 'https://w3w.co/filled.count.soap' };
assert('2.7 formatW3WForAlert contains words', w3w.formatW3WForAlert(mockW3W).includes('filled.count.soap'));
assert('2.8 formatW3WForAlert contains link', w3w.formatW3WForAlert(mockW3W).includes('https://w3w.co'));
assert('2.9 formatW3WForSMS contains ///', w3w.formatW3WForSMS(mockW3W).includes('///'));
assert('2.10 formatW3WForSMS is compact', w3w.formatW3WForSMS(mockW3W).length < 40);

// ═══════════════════════════════════════════════
// FEATURE 3: AI Transcription
// ═══════════════════════════════════════════════
console.log('\n═══ FEATURE 3: AI Transcription ═══');
const aiTrans = await import('./js/aiTranscription.js');

assert('3.1 loadTranscriptionModel is function', typeof aiTrans.loadTranscriptionModel === 'function');
assert('3.2 startTranscription is function', typeof aiTrans.startTranscription === 'function');
assert('3.3 stopTranscription is function', typeof aiTrans.stopTranscription === 'function');
assert('3.4 saveTranscriptToIndexedDB is function', typeof aiTrans.saveTranscriptToIndexedDB === 'function');
assert('3.5 getTranscriptLines is function', typeof aiTrans.getTranscriptLines === 'function');

// Test loadTranscriptionModel without Transformers.js
globalThis.window.TransformersPipeline = undefined;
const model = await aiTrans.loadTranscriptionModel();
assert('3.6 Returns null when Transformers.js unavailable', model === null);

// Test stopTranscription with null recorder
const transcript = aiTrans.stopTranscription(null);
assert('3.7 stopTranscription(null) returns empty string', transcript === '');

// Test getTranscriptLines returns array
assert('3.8 getTranscriptLines returns array', Array.isArray(aiTrans.getTranscriptLines()));

// ═══════════════════════════════════════════════
// FEATURE 4: Live Transcript
// ═══════════════════════════════════════════════
console.log('\n═══ FEATURE 4: Live Transcript ═══');
const liveTrans = await import('./js/liveTranscript.js');

assert('4.1 startLiveTranscript is function', typeof liveTrans.startLiveTranscript === 'function');
assert('4.2 stopLiveTranscript is function', typeof liveTrans.stopLiveTranscript === 'function');
assert('4.3 getTranscriptAsBlob is function', typeof liveTrans.getTranscriptAsBlob === 'function');
assert('4.4 downloadTranscript is function', typeof liveTrans.downloadTranscript === 'function');
assert('4.5 getLiveTranscriptText is function', typeof liveTrans.getLiveTranscriptText === 'function');

// Test startLiveTranscript without Web Speech API
const recognition = liveTrans.startLiveTranscript('en-IN');
assert('4.6 Returns null when Web Speech API unavailable', recognition === null);

// Test stopLiveTranscript returns empty string
const stopped = liveTrans.stopLiveTranscript();
assert('4.7 stopLiveTranscript returns empty string', stopped === '');

// Test getLiveTranscriptText
assert('4.8 getLiveTranscriptText returns string', typeof liveTrans.getLiveTranscriptText() === 'string');

// ═══════════════════════════════════════════════
// FEATURE 5: Orientation Lock
// ═══════════════════════════════════════════════
console.log('\n═══ FEATURE 5: Orientation Lock ═══');
const orientLock = await import('./js/orientationLock.js');

assert('5.1 lockPortrait is function', typeof orientLock.lockPortrait === 'function');
assert('5.2 unlockOrientation is function', typeof orientLock.unlockOrientation === 'function');

// Test lockPortrait doesn't throw when screen.orientation is null
let lockError = false;
try { await orientLock.lockPortrait(); } catch (e) { lockError = true; }
assert('5.3 lockPortrait doesn\'t throw on unsupported', !lockError);

// Test unlockOrientation doesn't throw
let unlockError = false;
try { await orientLock.unlockOrientation(); } catch (e) { unlockError = true; }
assert('5.4 unlockOrientation doesn\'t throw on unsupported', !unlockError);

// ═══════════════════════════════════════════════
// FEATURE 6: Network Router
// ═══════════════════════════════════════════════
console.log('\n═══ FEATURE 6: Network Router ═══');
const netRouter = await import('./js/networkRouter.js');

assert('6.1 getNetworkInfo is function', typeof netRouter.getNetworkInfo === 'function');
assert('6.2 getAlertStrategy is function', typeof netRouter.getAlertStrategy === 'function');
assert('6.3 listenForNetworkChange is function', typeof netRouter.listenForNetworkChange === 'function');

// Test getNetworkInfo without Network API (no navigator.connection)
const netInfo = netRouter.getNetworkInfo();
assert('6.4 Returns fallback when API unavailable', netInfo.effectiveType === '4g');
assert('6.5 canStream is true on fallback', netInfo.canStream === true);
assert('6.6 type is unknown on fallback', netInfo.type === 'unknown');
assert('6.7 canSendEmail true on fallback', netInfo.canSendEmail === true);
assert('6.8 canSendSMS true on fallback', netInfo.canSendSMS === true);

// Test getAlertStrategy with fallback
const strategy = netRouter.getAlertStrategy();
assert('6.9 Strategy is "full" on 4g fallback', strategy.strategy === 'full');
assert('6.10 Full strategy allows stream', strategy.startVideoStream === true);
assert('6.11 Full strategy allows email', strategy.sendEmail === true);
assert('6.12 Full strategy allows SMS', strategy.sendSMS === true);
assert('6.13 Full strategy has no warning', strategy.message === null);

// Test with simulated slow connection
globalThis.navigator.connection = { type: 'cellular', effectiveType: 'slow-2g', downlink: 0.1, saveData: false, addEventListener: () => {} };
const slowInfo = netRouter.getNetworkInfo();
assert('6.14 Slow-2g detected correctly', slowInfo.effectiveType === 'slow-2g');
assert('6.15 canStream is false on slow-2g', slowInfo.canStream === false);

const slowStrategy = netRouter.getAlertStrategy();
assert('6.16 Slow-2g strategy is minimal', slowStrategy.strategy === 'minimal');
assert('6.17 Minimal skips email', slowStrategy.sendEmail === false);
assert('6.18 Minimal skips video', slowStrategy.startVideoStream === false);
assert('6.19 Minimal allows SMS', slowStrategy.sendSMS === true);
assert('6.20 Minimal has warning message', slowStrategy.message !== null);

// Test 2g
globalThis.navigator.connection.effectiveType = '2g';
globalThis.navigator.connection.type = 'cellular';
const strat2g = netRouter.getAlertStrategy();
assert('6.21 2g strategy is essential', strat2g.strategy === 'essential');
assert('6.22 Essential sends email', strat2g.sendEmail === true);
assert('6.23 Essential skips video', strat2g.startVideoStream === false);

// Test 3g
globalThis.navigator.connection.effectiveType = '3g';
const strat3g = netRouter.getAlertStrategy();
assert('6.24 3g strategy is standard', strat3g.strategy === 'standard');
assert('6.25 Standard skips video', strat3g.startVideoStream === false);
assert('6.26 Standard sends email', strat3g.sendEmail === true);

// Test listenForNetworkChange
let changeFired = false;
netRouter.listenForNetworkChange(() => { changeFired = true; });
assert('6.27 listenForNetworkChange doesn\'t throw', true);

// Reset
globalThis.navigator.connection = null;

// ═══════════════════════════════════════════════
// FEATURE 7: Contact Picker
// ═══════════════════════════════════════════════
console.log('\n═══ FEATURE 7: Contact Picker ═══');
const picker = await import('./js/contactPicker.js');

assert('7.1 isContactPickerSupported is function', typeof picker.isContactPickerSupported === 'function');
assert('7.2 pickContacts is function', typeof picker.pickContacts === 'function');
assert('7.3 formatContactForSafeHer is function', typeof picker.formatContactForSafeHer === 'function');

// Test unsupported
assert('7.4 Returns false when API unavailable', picker.isContactPickerSupported() === false);

// Test pickContacts on unsupported browser
const pickResult = await picker.pickContacts();
assert('7.5 pickContacts returns error on unsupported', pickResult.success === false);
assert('7.6 pickContacts has error message', pickResult.error.includes('not supported'));
assert('7.7 pickContacts has empty contacts array', pickResult.contacts.length === 0);

// Test formatContactForSafeHer
const formatted = picker.formatContactForSafeHer({
  name: '  John Doe  ',
  phone: '+91 98765 43210',
  email: ' John@Example.COM '
});
assert('7.8 Name is trimmed', formatted.name === 'John Doe');
assert('7.9 Phone spaces removed', formatted.phone === '+919876543210');
assert('7.10 Email lowercased+trimmed', formatted.email === 'john@example.com');
assert('7.11 Default relation is Other', formatted.relation === 'Other');

// Test with missing fields
const minimal = picker.formatContactForSafeHer({ name: null, phone: '', email: '' });
assert('7.12 Null name becomes Unknown', minimal.name === 'Unknown');
assert('7.13 Empty phone stays empty', minimal.phone === '');
assert('7.14 Empty email stays empty', minimal.email === '');

// ═══════════════════════════════════════════════
// FEATURE 8: Lingva Translate
// ═══════════════════════════════════════════════
console.log('\n═══ FEATURE 8: Lingva Translate ═══');
const lingva = await import('./js/lingvaTranslate.js');

assert('8.1 translateText is function', typeof lingva.translateText === 'function');
assert('8.2 translateAlertEmailBody is function', typeof lingva.translateAlertEmailBody === 'function');
assert('8.3 translateSOSMessage is function', typeof lingva.translateSOSMessage === 'function');
assert('8.4 SUPPORTED_LANGUAGES is object', typeof lingva.SUPPORTED_LANGUAGES === 'object');
assert('8.5 getTranslationLanguage is function', typeof lingva.getTranslationLanguage === 'function');

// Test SUPPORTED_LANGUAGES content
assert('8.6 Has en', lingva.SUPPORTED_LANGUAGES['en'] === 'English');
assert('8.7 Has hi', lingva.SUPPORTED_LANGUAGES['hi'] === 'Hindi');
assert('8.8 Has te', lingva.SUPPORTED_LANGUAGES['te'] === 'Telugu');
assert('8.9 Has ta', lingva.SUPPORTED_LANGUAGES['ta'] === 'Tamil');
assert('8.10 Has 20 languages', Object.keys(lingva.SUPPORTED_LANGUAGES).length === 20);

// Test same-language passthrough
const sameText = await lingva.translateText('Hello World', 'en', 'en');
assert('8.11 Same lang returns original text', sameText === 'Hello World');

// Test empty text
const emptyResult = await lingva.translateText('', 'hi');
assert('8.12 Empty text returns empty', emptyResult === '');

// Test null/whitespace
const wsResult = await lingva.translateText('   ', 'hi');
assert('8.13 Whitespace-only returns original', wsResult === '   ');

// Test translateText with network down — should return original
const failResult = await lingva.translateText('Hello', 'hi', 'en');
assert('8.14 Returns original on all API failures', failResult === 'Hello');

// Test translateAlertEmailBody passthrough for English
const enBody = await lingva.translateAlertEmailBody('test body', 'en');
assert('8.15 English body returned as-is', enBody === 'test body');

// Test translateAlertEmailBody with null lang
const nullBody = await lingva.translateAlertEmailBody('test body', null);
assert('8.16 Null lang returns body as-is', nullBody === 'test body');

// Test translateSOSMessage passthrough
const enMsg = await lingva.translateSOSMessage('SOS Help!', 'en');
assert('8.17 English SOS message returned as-is', enMsg === 'SOS Help!');

// Test getTranslationLanguage falls back to en
assert('8.18 getTranslationLanguage returns en by default', lingva.getTranslationLanguage() === 'en');

// Test translateAlertEmailBody preserves GPS coordinates
const gpsBody = "EMERGENCY ALERT\nGPS Coordinates: Lat 17.385, Lng 78.486\nhttps://maps.google.com/?q=17.385,78.486\n///filled.count.soap";
const translatedGPS = await lingva.translateAlertEmailBody(gpsBody, 'hi');
assert('8.19 Preserves URL line', translatedGPS.includes('https://maps.google.com'));
assert('8.20 Preserves W3W address', translatedGPS.includes('///filled.count.soap'));

// ═══════════════════════════════════════════════
// CROSS-FEATURE INTEGRATION TESTS
// ═══════════════════════════════════════════════
console.log('\n═══ CROSS-FEATURE TESTS ═══');

// Test IP fallback → W3W chain
ipGeo.saveLastGPS(17.385, 78.4867);
const cachedResult = ipGeo.getLastKnownGPS();
assert('X.1 Cached GPS available for W3W lookup', cachedResult !== null && cachedResult.lat === 17.385);

// Test network strategy affects LiveStream
const netResult = netRouter.getAlertStrategy();
assert('X.2 Network strategy object has required fields', 
  'strategy' in netResult && 'sendSMS' in netResult && 'startVideoStream' in netResult);

// Test W3W SMS format fits in SMS limit
const smsW3W = w3w.formatW3WForSMS(mockW3W);
assert('X.3 W3W SMS format under 30 chars', smsW3W.length < 30);

// Test orientation functions return promises
const lockPromise = orientLock.lockPortrait();
assert('X.4 lockPortrait returns promise', lockPromise instanceof Promise);
const unlockPromise = orientLock.unlockOrientation();
assert('X.5 unlockOrientation returns promise', unlockPromise instanceof Promise);

// ═══════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`RESULTS: ${pass} PASS, ${fail} FAIL out of ${pass + fail} tests`);
console.log('═'.repeat(50));
process.exit(fail > 0 ? 1 : 0);
