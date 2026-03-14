/* ═══════════════════════════════════════════════
   SafeHer — Feature 7: Contact Picker API
   Lets users import contacts directly from their
   phone's native contacts app — no typing, no mistakes.
   Available on Android Chrome — falls back to manual
   entry on unsupported browsers.
   ═══════════════════════════════════════════════ */

/**
 * isContactPickerSupported()
 * Returns true if the browser supports the Contact Picker API.
 * Only Android Chrome currently supports this.
 */
export function isContactPickerSupported() {
  return 'contacts' in navigator && 'ContactsManager' in window;
}

/**
 * pickContacts()
 * Opens the native contacts app and lets the user select one or more contacts.
 * Returns { success, contacts[], error? }
 */
export async function pickContacts() {
  if (!isContactPickerSupported()) {
    return {
      success: false,
      error: 'Contact Picker not supported on this browser. Please use Chrome on Android.',
      contacts: []
    };
  }

  try {
    const properties = ['name', 'tel', 'email'];
    const options = { multiple: true }; // allow picking multiple contacts at once

    const selectedContacts = await navigator.contacts.select(properties, options);

    // Normalise the contact data
    const normalised = selectedContacts.map(contact => ({
      name: contact.name?.[0] || 'Unknown',
      phone: contact.tel?.[0] || '',
      email: contact.email?.[0] || ''
    })).filter(c => c.phone || c.email); // only keep contacts with at least phone or email

    console.log('[ContactPicker] ✅ Selected', normalised.length, 'contacts');
    return { success: true, contacts: normalised };

  } catch (error) {
    if (error.name === 'AbortError') {
      // User cancelled — not an error
      console.log('[ContactPicker] User cancelled contact picker');
      return { success: false, error: 'cancelled', contacts: [] };
    }
    console.error('[ContactPicker] Error:', error);
    return { success: false, error: error.message, contacts: [] };
  }
}

/**
 * formatContactForSafeHer(contact)
 * Cleans up a raw contact for SafeHer's contact format.
 */
export function formatContactForSafeHer(contact) {
  return {
    name: (contact.name || 'Unknown').trim(),
    phone: (contact.phone || '').replace(/\s+/g, ''), // remove spaces from phone number
    email: (contact.email || '').toLowerCase().trim(),
    relation: 'Other' // default — user can edit later
  };
}
