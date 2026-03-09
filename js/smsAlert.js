/* ═══════════════════════════════════════════════
   SafeHer — Feature 11: SMS Alert System
   Send SMS via native Android/iOS sms: intent
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';
  console.log('[SMSAlert] Module loading...');

  const SMSAlert = {

    /* Send SMS via native sms: URI (Android / iOS) */
    sendNativeSMS(phone, message) {
      try {
        console.log('[SMSAlert] Sending native SMS to', phone);
        const encoded = encodeURIComponent(message);
        window.open('sms:' + phone + '?body=' + encoded, '_self');
      } catch (err) {
        console.error('[SMSAlert] sendNativeSMS() error:', err);
      }
    },

    /* Send SMS to all emergency contacts via native intent */
    sendToAllContacts(message) {
      try {
        const contacts = JSON.parse(localStorage.getItem('safeher_contacts') || '[]');
        if (!contacts.length) { console.warn('[SMSAlert] No emergency contacts found'); return; }
        const phones = contacts.map(c => c.phone).filter(Boolean).join(',');
        if (!phones) { console.warn('[SMSAlert] No phone numbers found'); return; }
        console.log('[SMSAlert] Sending SMS to all contacts:', phones);
        const encoded = encodeURIComponent(message);
        window.open('sms:' + phones + '?body=' + encoded, '_self');
      } catch (err) {
        console.error('[SMSAlert] sendToAllContacts() error:', err);
      }
    },

    /* Build SOS message with location */
    async buildSOSMessage() {
      try {
        let msg = '🚨 SAFEHER SOS ALERT 🚨\nI need help immediately!\n';
        if (navigator.geolocation) {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          }).catch(() => null);
          if (pos) {
            const lat = pos.coords.latitude.toFixed(6);
            const lng = pos.coords.longitude.toFixed(6);
            msg += '\n📍 My Location:\nhttps://www.google.com/maps?q=' + lat + ',' + lng + '\n';
          }
        }
        msg += '\n⏰ Time: ' + new Date().toLocaleString() + '\n— Sent via SafeHer App';
        return msg;
      } catch (err) {
        console.error('[SMSAlert] buildSOSMessage() error:', err);
        return '🚨 SAFEHER SOS ALERT — I need help immediately!';
      }
    },

    /* Send SOS SMS to all contacts */
    async sendSOSAlert() {
      try {
        console.log('[SMSAlert] Sending SOS alert SMS...');
        const message = await this.buildSOSMessage();
        this.sendToAllContacts(message);
        return true;
      } catch (err) {
        console.error('[SMSAlert] sendSOSAlert() error:', err);
        return false;
      }
    },

    init() {
      try {
        /* Wire manual SMS button */
        const btnSendSMS = document.getElementById('btn-send-test-sms');
        if (btnSendSMS) {
          btnSendSMS.addEventListener('click', async () => {
            const msg = await this.buildSOSMessage();
            this.sendToAllContacts(msg);
          });
        }

        console.log('[SMSAlert] ✅ Module initialized');
      } catch (err) {
        console.error('[SMSAlert] init() error:', err);
      }
    }
  };

  window.SMSAlert = SMSAlert;
})();
