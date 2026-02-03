(function () {
  const AUTH_KEY = "hm_auth_v1";
  const USERS_KEY = "hm_users_v1";

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch { return []; }
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function setAuth(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user, ts: Date.now() }));
  }

  function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
  }

  function me() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      return JSON.parse(raw).user || null;
    } catch {
      return null;
    }
  }

  function isAuthed() {
    const u = me();
    return !!u?.email;
  }

  function userExists(email) {
    return loadUsers().some(u => u.email === email);
  }

  function ensureDemoUser() {
    const users = loadUsers();
    if (users.some(u => u.email === "demo@homemanager.com")) return;

    users.push({
      id: "u_demo",
      name: "Demo Property Manager",
      email: "demo@homemanager.com",
      password: "password",
      role: "property_manager"
    });
    saveUsers(users);
  }

  function registerUser({ name, email, password, role }) {
    email = (email || "").toLowerCase();
    const users = loadUsers();

    if (users.some(u => u.email === email)) {
      return { ok: false, message: "An account already exists for that email." };
    }

    const user = {
      id: "u_" + Math.random().toString(16).slice(2, 10),
      name,
      email,
      password,  // prototype only
      role
    };

    users.push(user);
    saveUsers(users);
    setAuth({ email: user.email, name: user.name, role: user.role });
    return { ok: true };
  }

  function loginWithPassword(email, password) {
    email = (email || "").toLowerCase();
    const users = loadUsers();
    const user = users.find(u => u.email === email);

    if (!user) return { ok: false, message: "No account found for that email." };
    if (user.password !== password) return { ok: false, message: "Incorrect password." };

    setAuth({ email: user.email, name: user.name, role: user.role });
    return { ok: true };
  }

  function updatePassword(email, newPassword) {
    email = (email || "").toLowerCase();
    const users = loadUsers();
    const idx = users.findIndex(u => u.email === email);
    if (idx < 0) return { ok: false, message: "No account found for that email." };

    users[idx] = { ...users[idx], password: newPassword };
    saveUsers(users);
    return { ok: true };
  }

  function logout() {
    clearAuth();
  }

  window.Auth = {
    me,
    isAuthed,
    logout,
    registerUser,
    loginWithPassword,
    updatePassword,
    userExists,
    ensureDemoUser
  };
})();
