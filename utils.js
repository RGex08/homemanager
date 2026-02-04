/**
 * HomeManager Utilities
 * Shared helper functions for ID generation, formatting, and DOM operations
 */
(function () {
  "use strict";

  /**
   * Generate a unique ID using crypto API with fallback
   * @param {string} prefix - Prefix for the ID (e.g., 'p' for property)
   * @returns {string} Unique ID
   */
  function generateId(prefix = "") {
    let randomPart;

    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const array = new Uint32Array(2);
      crypto.getRandomValues(array);
      randomPart = array[0].toString(16) + array[1].toString(16).slice(0, 4);
    } else {
      randomPart = Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
    }

    return prefix + randomPart.slice(0, 12);
  }

  /**
   * Get today's date in YYYY-MM-DD format
   * @returns {string} Today's date
   */
  function today() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  /**
   * Format a number with locale-specific separators
   * @param {number} n - Number to format
   * @returns {string} Formatted number
   */
  function formatNumber(n) {
    return Number(n || 0).toLocaleString("en-US");
  }

  /**
   * Escape HTML to prevent XSS
   * @param {*} str - String to escape
   * @returns {string} Escaped string
   */
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Generate a status pill HTML with appropriate styling
   * @param {string} status - Status text
   * @returns {string} HTML string for status pill
   */
  function statusPill(status) {
    const { UNIT_STATUS, PAYMENT_STATUS, MAINTENANCE_STATUS } = window.Constants;

    const isPositive = [
      PAYMENT_STATUS.PAID,
      UNIT_STATUS.OCCUPIED,
      MAINTENANCE_STATUS.COMPLETE
    ].includes(status);

    const isNegative = [
      PAYMENT_STATUS.UNPAID,
      UNIT_STATUS.VACANT
    ].includes(status);

    let cls = "pill pill-mid";
    if (isPositive) cls = "pill pill-ok";
    if (isNegative) cls = "pill pill-warn";

    return `<span class="${cls}">${escapeHtml(status)}</span>`;
  }

  /**
   * Generate a priority badge HTML
   * @param {string} priority - Priority level
   * @returns {string} HTML string for priority badge
   */
  function priorityBadge(priority) {
    const { PRIORITY } = window.Constants;

    let cls = "pill pill-ok";
    if (priority === PRIORITY.MEDIUM) cls = "pill pill-mid";
    if (priority === PRIORITY.HIGH) cls = "pill pill-warn";

    return `<span class="${cls}">${escapeHtml(priority || PRIORITY.LOW)}</span>`;
  }

  /**
   * Generate HTML table from headers and rows
   * @param {string[]} headers - Table headers
   * @param {Array[]} rows - Table rows (each row is an array of cell contents)
   * @returns {string} HTML string for table
   */
  function createTable(headers, rows) {
    if (!rows || rows.length === 0) {
      return `<div class="muted small">No data available.</div>`;
    }

    const headerHtml = headers.map(h => `<th>${escapeHtml(h)}</th>`).join("");
    const rowsHtml = rows.map(r =>
      `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`
    ).join("");

    return `
      <div class="tablewrap">
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  /**
   * Get unit label with property name
   * @param {Object} unit - Unit object
   * @param {Object} state - Application state with properties
   * @returns {string} Formatted unit label
   */
  function getUnitLabel(unit, state) {
    if (!unit) return "—";
    const prop = state.properties.find(p => p.id === unit.propertyId);
    return `${prop?.name || "Property"} • ${unit.label}`;
  }

  /**
   * Get role display label
   * @param {string} role - Role key
   * @returns {string} Display label
   */
  function getRoleLabel(role) {
    const { ROLE_LABELS, ROLES } = window.Constants;
    return ROLE_LABELS[role] || ROLE_LABELS[ROLES.TENANT];
  }

  /**
   * Generate select options HTML from an array
   * @param {Array} items - Items to create options from
   * @param {string} valueKey - Key for option value
   * @param {string} labelKey - Key for option label (or function)
   * @param {string} placeholder - Placeholder option text
   * @returns {string} HTML string for select options
   */
  function createSelectOptions(items, valueKey, labelKey, placeholder = "") {
    let html = placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : "";

    items.forEach(item => {
      const value = item[valueKey];
      const label = typeof labelKey === "function" ? labelKey(item) : item[labelKey];
      html += `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
    });

    return html;
  }

  /**
   * Create category select options
   * @param {string[]} categories - Array of category names
   * @returns {string} HTML string for select options
   */
  function createCategoryOptions(categories) {
    return categories.map(c => `<option>${escapeHtml(c)}</option>`).join("");
  }

  /**
   * Debounce function calls
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(fn, delay = 300) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Parse URL hash into key and params
   * @param {string} defaultKey - Default route key
   * @returns {Object} Parsed hash with key and params
   */
  function parseHash(defaultKey = "dashboard") {
    const raw = (window.location.hash || `#${defaultKey}`).slice(1);
    const [key, qs] = raw.split("?");
    const params = new URLSearchParams(qs || "");
    return { key: key || defaultKey, params };
  }

  /**
   * Set URL hash without triggering reload
   * @param {string} key - Route key
   * @param {Object} params - Query parameters
   */
  function setHash(key, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    window.location.hash = queryString ? `#${key}?${queryString}` : `#${key}`;
  }

  // Export utilities
  window.Utils = Object.freeze({
    generateId,
    today,
    formatNumber,
    escapeHtml,
    statusPill,
    priorityBadge,
    createTable,
    getUnitLabel,
    getRoleLabel,
    createSelectOptions,
    createCategoryOptions,
    debounce,
    parseHash,
    setHash
  });

  // Alias common functions for backward compatibility
  window.Utils.fmt = formatNumber;
  window.Utils.esc = escapeHtml;
})();
