/**
 * HomeManager Authentication Module
 * Handles user registration, login, logout, and session management
 */
(function () {
  "use strict";

  const { STORAGE_KEYS, ROLES, ID_PREFIX } = window.Constants;
  const { generateId } = window.Utils;

  /**
   * Load users from localStorage
   * @returns {Array} Array of user objects
   */
  function loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
    } catch {
      return [];
    }
  }

  /**
   * Save users to localStorage
   * @param {Array} users - Array of user objects
   */
  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  /**
   * Set authenticated user session
   * @param {Object} user - User object with email, name, role
   */
  function setAuth(user) {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({
      user,
      ts: Date.now()
    }));
  }

  /**
   * Clear authentication session
   */
  function clearAuth() {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  }

  /**
   * Get current authenticated user
   * @returns {Object|null} User object or null if not authenticated
   */
  function me() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (!raw) return null;
      return JSON.parse(raw).user || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if user is authenticated
   */
  function isAuthed() {
    const user = me();
    return !!user?.email;
  }

  /**
   * Check if a user exists by email
   * @param {string} email - User email
   * @returns {boolean} True if user exists
   */
  function userExists(email) {
    return loadUsers().some(u => u.email === email);
  }

  /**
   * Ensure demo user exists for testing
   */
  function ensureDemoUser() {
    const users = loadUsers();
    const demoEmail = "demo@homemanager.com";

    if (users.some(u => u.email === demoEmail)) return;

    users.push({
      id: generateId(ID_PREFIX.USER),
      name: "Demo Property Manager",
      email: demoEmail,
      password: "password", // Prototype only - not secure
      role: ROLES.PROPERTY_MANAGER
    });
    saveUsers(users);
  }

  /**
   * Register a new user
   * @param {Object} params - User registration data
   * @param {string} params.name - User's full name
   * @param {string} params.email - User's email
   * @param {string} params.password - User's password
   * @param {string} params.role - User's role
   * @returns {Object} Result with ok status and optional message
   */
  function registerUser({ name, email, password, role }) {
    email = (email || "").toLowerCase().trim();
    const users = loadUsers();

    if (users.some(u => u.email === email)) {
      return { ok: false, message: "An account already exists for that email." };
    }

    const user = {
      id: generateId(ID_PREFIX.USER),
      name: name.trim(),
      email,
      password, // Prototype only - not secure
      role: role || ROLES.TENANT
    };

    users.push(user);
    saveUsers(users);
    setAuth({ email: user.email, name: user.name, role: user.role });

    return { ok: true };
  }

  /**
   * Login with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Object} Result with ok status and optional message
   */
  function loginWithPassword(email, password) {
    email = (email || "").toLowerCase().trim();
    const users = loadUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return { ok: false, message: "No account found for that email." };
    }

    if (user.password !== password) {
      return { ok: false, message: "Incorrect password." };
    }

    setAuth({ email: user.email, name: user.name, role: user.role });
    return { ok: true };
  }

  /**
   * Update user password
   * @param {string} email - User's email
   * @param {string} newPassword - New password
   * @returns {Object} Result with ok status and optional message
   */
  function updatePassword(email, newPassword) {
    email = (email || "").toLowerCase().trim();
    const users = loadUsers();
    const idx = users.findIndex(u => u.email === email);

    if (idx < 0) {
      return { ok: false, message: "No account found for that email." };
    }

    users[idx] = { ...users[idx], password: newPassword };
    saveUsers(users);

    return { ok: true };
  }

  /**
   * Logout current user
   */
  function logout() {
    clearAuth();
  }

  // Export Auth API
  window.Auth = Object.freeze({
    me,
    isAuthed,
    logout,
    registerUser,
    loginWithPassword,
    updatePassword,
    userExists,
    ensureDemoUser
  });
})();
