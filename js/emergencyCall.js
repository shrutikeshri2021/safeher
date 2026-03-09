/* ═══════════════════════════════════════════════
   SafeHer — Feature 10: Emergency Call Buttons
   Quick-dial emergency numbers (112/100/1091/108)
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';
  console.log('[EmergencyCall] Module loading...');

  const EmergencyCall = {
    numbers: [
      { id: 'universal', number: '112', label: 'Emergency',      icon: '🆘', desc: 'Universal Emergency' },
      { id: 'police',    number: '100', label: 'Police',          icon: '🚔', desc: 'Police Control Room' },
      { id: 'women',     number: '1091',label: 'Women Helpline',  icon: '👩‍💼', desc: 'Women Helpline' },
      { id: 'ambulance', number: '108', label: 'Ambulance',       icon: '🚑', desc: 'Ambulance Service' }
    ],

    call(numberId) {
      try {
        const entry = this.numbers.find(n => n.id === numberId);
        if (!entry) { console.warn('[EmergencyCall] Unknown number ID:', numberId); return; }
        console.log(`[EmergencyCall] Dialing ${entry.label} (${entry.number})...`);
        window.open('tel:' + entry.number, '_self');
      } catch (err) {
        console.error('[EmergencyCall] call() error:', err);
      }
    },

    dialDirect(number) {
      try {
        console.log('[EmergencyCall] Direct dial:', number);
        window.open('tel:' + number, '_self');
      } catch (err) {
        console.error('[EmergencyCall] dialDirect() error:', err);
      }
    },

    init() {
      try {
        document.querySelectorAll('[data-emergency-call]').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-emergency-call');
            this.call(id);
          });
        });
        console.log('[EmergencyCall] ✅ Module initialized');
      } catch (err) {
        console.error('[EmergencyCall] init() error:', err);
      }
    }
  };

  window.EmergencyCall = EmergencyCall;
})();
