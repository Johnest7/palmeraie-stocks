/**
 * config.js
 * ---------
 * Load environment variables for the frontend.
 * In production, these are injected via window.ENV in the HTML.
 * In development, these default to localhost.
 */

// Set API_BASE as a global variable so all scripts can use it
window.API_BASE = window.ENV?.API_BASE || 'http://localhost:8000';

// Also export as const for any modules that need it
const API_BASE = window.API_BASE;

// Export for use across the app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_BASE };
}
