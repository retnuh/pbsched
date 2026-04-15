/**
 * Escapes a string for safe insertion into HTML contexts.
 * Prevents XSS when interpolating user-supplied data into innerHTML.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
