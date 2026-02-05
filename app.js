/**
 * HomeManager Application
 * Main application logic with routing, views, and event handling
 */
(function () {
  "use strict";

  const { STORAGE_KEYS, ROLES, UNIT_STATUS, MAINTENANCE_STATUS, PAYMENT_STATUS, PRIORITY, CATEGORIES, PROPERTY_TYPES, NOTIFICATION_TYPES, ID_PREFIX, COLLECTIONS } = window.Constants;
  const { generateId, today, formatNumber, escapeHtml, statusPill, priorityBadge, createTable, getUnitLabel, getRoleLabel, parseHash, setHash, createSelectOptions, createCategoryOptions } = window.Utils;

  // Aliases for brevity
  const fmt = formatNumber;
  const esc = escapeHtml;
  const pillStatus = statusPill;

  // Auth check
  if (!window.Auth.isAuthed()) {
    window.location.href = "./index.html";
    return;
  }

  // Initialize data
  window.Data.bootstrap();

  // Current user info
  const me = window.Auth.me();
  const email = me.email;
  const roleOptions = Object.freeze([
    { value: "property_manager", label: "Property Manager" },
    { value: "home_owner", label: "Home Owner" },
    { value: "tenant", label: "Tenant" }
  ]);
  const roleLabelByValue = Object.freeze(Object.fromEntries(roleOptions.map(option => [option.value, option.label])));

  let selectedProfile = (me.role === ROLES.LANDLORD ? "home_owner" : me.role) || "property_manager";
  if (!roleLabelByValue[selectedProfile]) selectedProfile = "property_manager";


  // DOM elements
  const navEl = document.getElementById("nav");
  const viewEl = document.getElementById("view");
  const whoEl = document.getElementById("who");
  const whoEmailEl = document.getElementById("whoEmail");
  const roleBadge = document.getElementById("roleBadge");
  const profileSwitcher = document.getElementById("profileSwitcher");
  const profileSwitcherBtn = document.getElementById("profileSwitcherBtn");
  const profileSwitcherDropdown = document.getElementById("profileSwitcherDropdown");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  const kpiPills = document.getElementById("kpiPills");
  const globalSearchForm = document.getElementById("globalSearchForm");
  const globalSearchInput = document.getElementById("globalSearchInput");

  // Initialize UI
  whoEl.textContent = me.name || me.email;
  whoEmailEl.textContent = me.email;
  roleBadge.textContent = roleLabelByValue[selectedProfile];

  // Sidebar toggle functionality
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
  const appEl = document.querySelector(".app");
  const mobileQuery = window.matchMedia("(max-width: 980px)");
  let sidebarCollapsed = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === "true";

  if (mobileQuery.matches && localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === null) {
    sidebarCollapsed = true;
  }

  setSidebarCollapsed(sidebarCollapsed);

  sidebarToggle.addEventListener("click", () => {
    setSidebarCollapsed(!sidebarCollapsed);
  });

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener("click", () => {
      setSidebarCollapsed(true);
    });
  }

  function setSidebarCollapsed(nextState) {
    sidebarCollapsed = Boolean(nextState);
    appEl.classList.toggle("sidebar-collapsed", sidebarCollapsed);
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(sidebarCollapsed));
  }

  // User menu functionality
  const userMenuBtn = document.getElementById("userMenuBtn");
  const userMenuDropdown = document.getElementById("userMenuDropdown");
  const userMenu = document.querySelector(".user-menu");

  userMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userMenu.classList.toggle("open");
    userMenuDropdown.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    userMenu.classList.remove("open");
    userMenuDropdown.classList.remove("show");
    profileSwitcher.classList.remove("open");
    profileSwitcherDropdown.classList.remove("show");
  });

  userMenuDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  profileSwitcherBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    profileSwitcher.classList.toggle("open");
    profileSwitcherDropdown.classList.toggle("show");
  });

  profileSwitcherDropdown.addEventListener("click", (e) => {
    e.stopPropagation();

    const option = e.target.closest("[data-profile]");
    if (!option) return;

    selectedProfile = option.dataset.profile;
    roleBadge.textContent = roleLabelByValue[selectedProfile] || roleLabelByValue.property_manager;
    routes = getRoutesForRole();

    const { key } = parseHash();
    const availableRouteKeys = new Set([...routes, ...utilityRoutes].map(route => route.key));
    if (!availableRouteKeys.has(key)) {
      setHash(routes[0].key);
      return;
    }

    renderNav(routes);
    render();

    profileSwitcher.classList.remove("open");
    profileSwitcherDropdown.classList.remove("show");
  });

  // Logout handler
  document.getElementById("logoutBtnTop").addEventListener("click", () => {
    window.Auth.logout();
    window.location.href = "./index.html";
  });


  globalSearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = globalSearchInput.value.trim();
    if (!query) {
      setHash("dashboard");
      return;
    }
    setHash("search", { q: query });
  });

  // Routes configuration
  let routes = getRoutesForRole();
  const utilityRoutes = getUtilityRoutes();

  // View-local UI state for quick-add forms (not persisted in URL)
  let quickAddUnitPropertyId = "";
  let showMaintenanceQuickAdd = false;

  // Event delegation for dynamic content
  viewEl.addEventListener("click", handleViewClick);
  viewEl.addEventListener("submit", handleViewSubmit, true);
  viewEl.addEventListener("change", handleViewChange);

  // Initial render
  window.addEventListener("hashchange", () => {
    quickAddUnitPropertyId = "";
    showMaintenanceQuickAdd = false;
    render();
  });
  render();

  // ===== ROUTING & RENDERING =====

  function render() {
    const { key, params } = parseHash();

    globalSearchInput.value = key === "search" ? (params.get("q") || "") : "";

    renderNav(routes);

    if (key === "search") {
      const query = (params.get("q") || "").trim();

      renderKpis();
      pageTitle.textContent = "Search";
      pageSubtitle.textContent = query ? `Results for "${query}"` : "Find records across HomeManager";

      viewEl.innerHTML = viewSearch(query);

      highlightTopNav(null);
      highlightNavUnit(null);
      return;
    }

    // Dynamic Unit route
    if (key === "unit") {
      const unitId = params.get("unitId");
      const tab = params.get("tab") || "tenants";

      renderKpis();
      pageTitle.textContent = "Unit Detail";
      pageSubtitle.textContent = "Tenants \u2022 Leases \u2022 Maintenance \u2022 Features";

      viewEl.innerHTML = viewUnitDetail(unitId, tab);

      highlightNavUnit(unitId);
      highlightTopNav(null);
      return;
    }

    const match = [...routes, ...utilityRoutes].find(r => r.key === key) || routes[0];

    renderKpis();
    pageTitle.textContent = match.title;
    pageSubtitle.textContent = match.subtitle || "";

    viewEl.innerHTML = match.render();

    highlightTopNav(match.key);
    highlightNavUnit(null);
  }

  function highlightTopNav(routeKey) {
    navEl.querySelectorAll("a[data-key]").forEach(a => {
      a.classList.toggle("active", a.dataset.key === routeKey);
    });
  }

  function highlightNavUnit(unitId) {
    navEl.querySelectorAll(".navitem-child[data-unit]").forEach(a => {
      a.classList.toggle("active", unitId && a.getAttribute("data-unit") === unitId);
    });
  }

  function renderNav(items) {
    navEl.innerHTML = items.map(i => `
      <a class="navitem" href="#${i.key}" data-key="${i.key}">
        <span class="dot"></span><span>${i.title}</span>
      </a>
    `).join("");

    navEl.querySelectorAll("a[data-key]").forEach(link => {
      link.addEventListener("click", () => {
        if (mobileQuery.matches) {
          setSidebarCollapsed(true);
        }
      });
    });
  }

  function renderKpis() {
    const state = window.Data.db();

    const totalUnits = state.units.length;
    const occupied = state.units.filter(u => u.status === UNIT_STATUS.OCCUPIED).length;
    const occupancy = totalUnits ? Math.round((occupied / totalUnits) * 100) : 0;

    const jan = state.payments.filter(p => p.month === "2026-01");
    const collected = jan.filter(p => p.status === PAYMENT_STATUS.PAID).reduce((s, p) => s + p.amount, 0);
    const overdue = jan.filter(p => p.status !== PAYMENT_STATUS.PAID).length;

    kpiPills.innerHTML = `
      <span class="kpi">Occupancy: <b>${occupancy}%</b></span>
      <span class="kpi">Collected: <b>$${fmt(collected)}</b></span>
      <span class="kpi">Overdue: <b>${overdue}</b></span>
    `;
  }

  function getRoutesForRole() {
    const baseRoutes = [
      { key: "dashboard", title: "Dashboard", subtitle: "Portfolio overview", render: viewDashboard },
      { key: "properties", title: "Properties", subtitle: "Manage properties and units", render: viewProperties },
      { key: "maintenance", title: "Maintenance", subtitle: "Track and schedule maintenance", render: viewMaintenance },
      { key: "vendors", title: "Vendors", subtitle: "Preferred vendors and contacts", render: viewVendors },
      { key: "reports", title: "Reports", subtitle: "Financial and operational reports", render: viewReports },
      { key: "notifications", title: "Notifications", subtitle: "Alerts and reminders", render: viewNotifications }
    ];

    if (selectedProfile === "tenant") {
      return baseRoutes.filter(route => ["dashboard", "maintenance", "notifications"].includes(route.key));
    }

    if (selectedProfile === "home_owner") {
      return baseRoutes.filter(route => route.key !== "vendors");
    }

    return baseRoutes;
  }

  function getUtilityRoutes() {
    return [
      { key: "profile", title: "My Profile", subtitle: "Manage your profile", render: viewProfile },
      { key: "settings", title: "My Settings", subtitle: "Application settings", render: viewSettings },
      { key: "account", title: "My Account", subtitle: "Account information", render: viewAccount }
    ];
  }

  // ===== EVENT DELEGATION HANDLERS =====

  function handleViewClick(e) {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const state = window.Data.db();

    switch (action) {
      case "delete-unit": {
        const id = target.dataset.id;
        const unit = state.units.find(u => u.id === id);
        if (!unit) return;

        if (unit.leaseActive) {
          alert("This unit cannot be deleted because it has an active lease.");
          return;
        }

        if (!confirm(`Delete ${unit.label}?`)) return;

        state.unit_features.filter(f => f.unitId === id).forEach(f => {
          window.Data.remove(COLLECTIONS.UNIT_FEATURES, f.id);
        });
        state.maintenance.filter(m => m.unitId === id).forEach(m => {
          window.Data.remove(COLLECTIONS.MAINTENANCE, m.id);
        });

        window.Data.remove(COLLECTIONS.UNITS, id);
        render();
        break;
      }

      case "open-unit": {
        const id = target.dataset.id;
        setHash("unit", { unitId: id, tab: "tenants" });
        break;
      }

      case "delete-property": {
        const id = target.dataset.id;
        const units = state.units.filter(u => u.propertyId === id);

        if (units.length > 0) {
          alert("Cannot delete property with units. Delete all units first.");
          return;
        }

        if (!confirm("Delete this property?")) return;
        window.Data.remove(COLLECTIONS.PROPERTIES, id);
        render();
        break;
      }

      case "quick-add-unit": {
        const propertyId = target.dataset.propertyId;
        if (!propertyId) return;
        quickAddUnitPropertyId = quickAddUnitPropertyId === propertyId ? "" : propertyId;
        render();
        break;
      }

      case "cancel-quick-add-unit": {
        quickAddUnitPropertyId = "";
        render();
        break;
      }

      case "quick-add-maintenance": {
        showMaintenanceQuickAdd = !showMaintenanceQuickAdd;
        render();
        break;
      }

      case "cancel-quick-add-maintenance": {
        showMaintenanceQuickAdd = false;
        render();
        break;
      }

      case "delete-vendor": {
        const id = target.dataset.id;
        if (!confirm("Delete this vendor?")) return;
        window.Data.remove(COLLECTIONS.VENDORS, id);
        render();
        break;
      }

      case "delete-tenant": {
        const id = target.dataset.id;
        if (!confirm("Delete this tenant?")) return;
        window.Data.remove(COLLECTIONS.TENANTS, id);
        render();
        break;
      }

      case "delete-feature": {
        const id = target.dataset.id;
        if (!confirm("Delete this feature?")) return;
        window.Data.remove(COLLECTIONS.UNIT_FEATURES, id);
        render();
        break;
      }

      case "advance-maintenance": {
        const id = target.dataset.id;
        const next = target.dataset.next;
        const item = state.maintenance.find(m => m.id === id);
        if (!item) return;

        if (next === MAINTENANCE_STATUS.COMPLETE) {
          const costStr = prompt("Enter completion cost (optional):", "0");
          const cost = Number(costStr) || 0;

          window.Data.add(COLLECTIONS.MAINTENANCE_HISTORY, {
            id: generateId(ID_PREFIX.MAINTENANCE_HISTORY),
            unitId: item.unitId,
            title: item.title,
            category: item.category,
            status: MAINTENANCE_STATUS.COMPLETE,
            cost: cost,
            vendorId: item.vendorId || "",
            featureId: item.featureId || "",
            completed: today()
          });
          window.Data.remove(COLLECTIONS.MAINTENANCE, item.id);
        } else {
          window.Data.upsert(COLLECTIONS.MAINTENANCE, { ...item, status: next });
        }

        render();
        break;
      }

      case "end-lease": {
        const leaseId = target.dataset.id;
        const lease = state.leases.find(l => l.id === leaseId);
        if (!lease) return;

        if (!confirm("End this lease? Unit will be marked as vacant.")) return;

        const unit = state.units.find(u => u.id === lease.unitId);
        if (unit) {
          window.Data.upsert(COLLECTIONS.UNITS, {
            ...unit,
            status: UNIT_STATUS.VACANT,
            tenantName: "",
            leaseActive: false
          });
        }

        window.Data.upsert(COLLECTIONS.LEASES, { ...lease, active: false });
        render();
        break;
      }

      case "toggle-payment": {
        const paymentId = target.dataset.id;
        const payment = state.payments.find(p => p.id === paymentId);
        if (!payment) return;

        const newStatus = payment.status === PAYMENT_STATUS.PAID ? PAYMENT_STATUS.UNPAID : PAYMENT_STATUS.PAID;
        window.Data.upsert(COLLECTIONS.PAYMENTS, { ...payment, status: newStatus });
        render();
        break;
      }

      case "clear-notifications": {
        if (!confirm("Clear all notifications?")) return;
        window.Data.write(s => { s.notifications = []; });
        render();
        break;
      }

      case "reset-sidebar": {
        localStorage.removeItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
        setSidebarCollapsed(false);
        alert("Sidebar state reset.");
        break;
      }

      case "export-data": {
        const data = JSON.stringify(window.Data.db(), null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `homemanager-backup-${today()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        break;
      }

      case "reset-demo-data": {
        if (!confirm("Reset all data to the default demo data? Your current data will be lost.")) return;
        localStorage.removeItem(STORAGE_KEYS.DATA);
        window.Data.bootstrap();
        render();
        alert("Data reset to demo defaults.");
        break;
      }

      case "clear-all-data": {
        if (!confirm("Delete ALL data? This cannot be undone!")) return;
        if (!confirm("Are you absolutely sure? All properties, units, tenants, and settings will be permanently deleted.")) return;
        localStorage.clear();
        window.location.href = "./index.html";
        break;
      }

      case "deactivate-account": {
        alert("Account deactivation is not available in the prototype. In a production app, this would temporarily disable your account.");
        break;
      }

      case "delete-account": {
        if (!confirm("Permanently delete your account? This cannot be undone.")) return;
        if (!confirm("This will erase ALL data including properties, tenants, leases, and your login. Continue?")) return;
        localStorage.clear();
        window.location.href = "./index.html";
        break;
      }
    }
  }

  function handleViewSubmit(e) {
    if (e.target.tagName !== "FORM") return;

    const form = e.target;
    const formId = form.id;
    const state = window.Data.db();

    e.preventDefault();

    switch (formId) {
      case "addPropertyForm": {
        const name = form.name.value.trim();
        const address = form.address.value.trim();
        const type = form.type.value;
        if (!name || !address) return;

        window.Data.add(COLLECTIONS.PROPERTIES, {
          id: generateId(ID_PREFIX.PROPERTY),
          name,
          address,
          type
        });
        form.reset();
        render();
        break;
      }

      case "addUnitFromPropertyCard": {
        const propertyId = form.propertyId.value;
        const label = form.label.value.trim();
        const sqft = Number(form.sqft.value || 0);
        const rent = Number(form.rent.value || 0);
        if (!propertyId || !label) {
          alert("Property and unit label are required.");
          return;
        }

        window.Data.add(COLLECTIONS.UNITS, {
          id: generateId(ID_PREFIX.UNIT),
          propertyId,
          label,
          sqft,
          rent,
          status: UNIT_STATUS.VACANT,
          tenantName: "",
          leaseActive: false
        });
        form.reset();
        quickAddUnitPropertyId = "";
        render();
        break;
      }

      case "addVendorForm": {
        const name = form.name.value.trim();
        const category = form.category.value;
        const phone = form.phone.value.trim();
        const emailV = form.email.value.trim();

        if (!name) {
          alert("Vendor name is required.");
          return;
        }

        window.Data.add(COLLECTIONS.VENDORS, {
          id: generateId(ID_PREFIX.VENDOR),
          name,
          category,
          phone,
          email: emailV
        });
        form.reset();
        render();
        break;
      }

      case "addMaintenanceForm": {
        const unitId = form.unitId.value;
        const title = form.title.value.trim();
        const category = form.category.value;
        const priority = form.priority.value;
        const description = form.description.value.trim();

        if (!unitId || !title) {
          alert("Unit and title are required.");
          return;
        }

        const maintId = generateId(ID_PREFIX.MAINTENANCE);
        window.Data.add(COLLECTIONS.MAINTENANCE, {
          id: maintId,
          unitId,
          title,
          category,
          priority,
          description,
          status: MAINTENANCE_STATUS.OPEN,
          created: today(),
          vendorId: "",
          featureId: ""
        });

        window.Data.add(COLLECTIONS.NOTIFICATIONS, {
          id: generateId(ID_PREFIX.NOTIFICATION),
          type: NOTIFICATION_TYPES.MAINTENANCE,
          text: `New maintenance request: ${title}`,
          created: today()
        });

        form.reset();
        showMaintenanceQuickAdd = false;
        render();
        break;
      }

      case "addTenantForUnit": {
        const { params } = parseHash();
        const unitId = params.get("unitId");
        const name = form.name.value.trim();
        const emailT = form.email.value.trim().toLowerCase();
        const phone = form.phone.value.trim();
        if (!name || !emailT) return;

        window.Data.add(COLLECTIONS.TENANTS, {
          id: generateId(ID_PREFIX.TENANT),
          name,
          email: emailT,
          phone: phone || "",
          unitId
        });
        form.reset();
        render();
        break;
      }

      case "addFeatureForUnit": {
        const { params } = parseHash();
        const unitId = params.get("unitId");
        const category = form.category.value;
        const name = form.name.value.trim();
        const manufacturer = form.manufacturer.value.trim();
        const model = form.model.value.trim();
        const installDate = form.installDate.value;
        const warrantyExpires = form.warrantyExpires.value;
        const lastServiceDate = form.lastServiceDate.value;
        const notes = form.notes.value.trim();

        if (!name) {
          alert("Feature name is required.");
          return;
        }

        window.Data.add(COLLECTIONS.UNIT_FEATURES, {
          id: generateId(ID_PREFIX.FEATURE),
          unitId,
          category,
          name,
          manufacturer,
          model,
          installDate,
          warrantyExpires,
          lastServiceDate,
          notes
        });
        form.reset();
        render();
        break;
      }

      case "addMaintForUnit": {
        const { params } = parseHash();
        const unitId = params.get("unitId");
        const title = form.title.value.trim();
        const category = form.category.value;
        const priority = form.priority.value;
        const featureId = form.featureId.value || "";
        const description = form.description.value.trim();
        if (!title) return;

        window.Data.add(COLLECTIONS.MAINTENANCE, {
          id: generateId(ID_PREFIX.MAINTENANCE),
          unitId,
          title,
          category,
          priority,
          description,
          featureId,
          status: MAINTENANCE_STATUS.OPEN,
          created: today(),
          vendorId: ""
        });

        window.Data.add(COLLECTIONS.NOTIFICATIONS, {
          id: generateId(ID_PREFIX.NOTIFICATION),
          type: NOTIFICATION_TYPES.MAINTENANCE,
          text: `New maintenance request: ${title}`,
          created: today()
        });

        form.reset();
        render();
        break;
      }

      case "addLeaseForUnit": {
        const { params } = parseHash();
        const unitId = params.get("unitId");
        const tenantId = form.tenantId.value;
        const start = form.start.value;
        const end = form.end.value;
        const rent = Number(form.rent.value || 0);
        const deposit = Number(form.deposit.value || 0);

        if (!tenantId || !start || !end || !rent) {
          alert("Please fill all required fields.");
          return;
        }

        const leaseId = generateId(ID_PREFIX.LEASE);
        window.Data.add(COLLECTIONS.LEASES, {
          id: leaseId,
          unitId,
          tenantId,
          start,
          end,
          rent,
          deposit
        });

        const unit = state.units.find(u => u.id === unitId);
        const tenant = state.tenants.find(t => t.id === tenantId);
        if (unit && tenant) {
          window.Data.upsert(COLLECTIONS.UNITS, {
            ...unit,
            status: UNIT_STATUS.OCCUPIED,
            tenantName: tenant.name,
            leaseActive: true
          });
        }

        createPaymentRecords(leaseId, start, end, rent);
        form.reset();
        render();
        break;
      }

      case "profileForm": {
        const name = form.name.value.trim();
        const phone = form.phone.value.trim();
        const phone2 = form.phone2.value.trim();
        const dob = form.dob.value;
        const address = form.address.value.trim();
        const address2 = form.address2.value.trim();
        const city = form.city.value.trim();
        const state = form.state.value.trim();
        const zip = form.zip.value.trim();
        const company = form.company.value.trim();
        const jobTitle = form.jobTitle.value.trim();
        const portfolioName = form.portfolioName.value.trim();
        const licenseNumber = form.licenseNumber.value.trim();
        const bio = form.bio.value.trim();

        if (!phone) {
          alert("Phone is required.");
          return;
        }

        const existing = window.Data.getProfile(email) || {};
        window.Data.setProfile(email, {
          ...existing,
          completed: true,
          phone,
          phone2,
          dob,
          address,
          address2,
          city,
          state,
          zip,
          company,
          jobTitle,
          portfolioName,
          licenseNumber,
          bio,
          role: me.role
        });

        alert("Profile updated successfully!");
        render();
        break;
      }

      case "emergencyContactForm": {
        const emergencyName = form.emergencyName.value.trim();
        const emergencyRelation = form.emergencyRelation.value.trim();
        const emergencyPhone = form.emergencyPhone.value.trim();
        const emergencyEmail = form.emergencyEmail.value.trim();

        const existing = window.Data.getProfile(email) || {};
        window.Data.setProfile(email, {
          ...existing,
          emergencyName,
          emergencyRelation,
          emergencyPhone,
          emergencyEmail
        });

        alert("Emergency contact saved!");
        render();
        break;
      }

      case "settingsForm": {
        const emailNotifications = form.emailNotifications.checked;
        const maintenanceAlerts = form.maintenanceAlerts.checked;
        const paymentReminders = form.paymentReminders.checked;
        const leaseAlerts = form.leaseAlerts.checked;
        const currency = form.currency.value;
        const dateFormat = form.dateFormat.value;
        const timezone = form.timezone.value;
        const pageSize = form.pageSize.value;
        const defaultView = form.defaultView.value;

        const existing = window.Data.getProfile(email) || {};
        window.Data.setProfile(email, {
          ...existing,
          settings: {
            emailNotifications,
            maintenanceAlerts,
            paymentReminders,
            leaseAlerts,
            currency,
            dateFormat,
            timezone,
            pageSize,
            defaultView
          }
        });

        alert("Settings saved!");
        render();
        break;
      }

      case "changePasswordForm": {
        const currentPassword = form.currentPassword.value;
        const newPassword = form.newPassword.value;
        const confirmPassword = form.confirmPassword.value;

        if (newPassword.length < 6) {
          alert("New password must be at least 6 characters.");
          return;
        }
        if (newPassword !== confirmPassword) {
          alert("New passwords do not match.");
          return;
        }

        // Verify current password by attempting login
        const loginResult = window.Auth.loginWithPassword(email, currentPassword);
        if (!loginResult.ok) {
          alert("Current password is incorrect.");
          return;
        }

        const updateResult = window.Auth.updatePassword(email, newPassword);
        if (!updateResult.ok) {
          alert(updateResult.message || "Could not update password.");
          return;
        }

        alert("Password updated successfully!");
        form.reset();
        break;
      }
    }
  }

  function handleViewChange(e) {
    const target = e.target;

    // Filter change handlers for maintenance page
    if (target.id === "filterStatus" || target.id === "filterUnit") {
      render();
    }
  }

  // ===== HELPER FUNCTIONS =====

  function createPaymentRecords(leaseId, startDate, endDate, rent) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
      const month = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;

      window.Data.add(COLLECTIONS.PAYMENTS, {
        id: generateId(ID_PREFIX.PAYMENT),
        leaseId: leaseId,
        month: month,
        amount: rent,
        status: PAYMENT_STATUS.UNPAID
      });

      current.setMonth(current.getMonth() + 1);
    }
  }

  function getMaintenanceCategories() {
    return [
      CATEGORIES.GENERAL,
      CATEGORIES.HVAC,
      CATEGORIES.PLUMBING,
      CATEGORIES.ELECTRICAL,
      CATEGORIES.APPLIANCE,
      CATEGORIES.ROOF,
      CATEGORIES.PEST_CONTROL,
      CATEGORIES.CLEANING,
      CATEGORIES.FLOORING,
      CATEGORIES.WINDOWS,
      CATEGORIES.PAINTING
    ];
  }

  function getFeatureCategories() {
    return [
      CATEGORIES.APPLIANCE,
      CATEGORIES.HVAC,
      CATEGORIES.PLUMBING,
      CATEGORIES.ELECTRICAL,
      CATEGORIES.FLOORING,
      CATEGORIES.ROOF,
      CATEGORIES.WINDOWS,
      CATEGORIES.EXTERIOR,
      CATEGORIES.SAFETY,
      CATEGORIES.OTHER
    ];
  }

  function getVendorCategories() {
    return [
      CATEGORIES.GENERAL,
      CATEGORIES.HVAC,
      CATEGORIES.PLUMBING,
      CATEGORIES.ELECTRICAL,
      CATEGORIES.APPLIANCE,
      CATEGORIES.ROOF,
      CATEGORIES.CLEANING,
      CATEGORIES.PEST_CONTROL,
      CATEGORIES.LANDSCAPING,
      CATEGORIES.PAINTING
    ];
  }

  function getPropertyTypes() {
    return Object.values(PROPERTY_TYPES);
  }

  // ===== VIEW FUNCTIONS =====

  function viewUnitDetail(unitId, tab) {
    const state = window.Data.db();
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return `<div class="panel"><div class="panel-h">Unit not found</div></div>`;

    const prop = state.properties.find(p => p.id === unit.propertyId);
    const tenants = state.tenants.filter(t => t.unitId === unitId);
    const leases = state.leases.filter(l => l.unitId === unitId);
    const maint = state.maintenance.filter(m => m.unitId === unitId);
    const maintHistory = (state.maintenance_history || []).filter(m => m.unitId === unitId);
    const features = (state.unit_features || []).filter(f => f.unitId === unitId);

    const tabLink = (t) => `#unit?unitId=${unitId}&tab=${t}`;

    return `
      <div class="panel">
        <div class="row between">
          <div>
            <div class="panel-h">${esc(prop?.name || "Property")} \u2022 ${esc(unit.label)}</div>
            <div class="muted small">Address: ${esc(prop?.address || "\u2014")} | ${unit.sqft} sqft | $${fmt(unit.rent)}/mo</div>
          </div>
          <div>
            ${pillStatus(unit.status)}
          </div>
        </div>

        <div class="tabs mt12">
          <a class="tab ${tab === "tenants" ? "tab-active" : ""}" href="${tabLink("tenants")}">Tenants</a>
          <a class="tab ${tab === "leases" ? "tab-active" : ""}" href="${tabLink("leases")}">Leases</a>
          <a class="tab ${tab === "maintenance" ? "tab-active" : ""}" href="${tabLink("maintenance")}">Maintenance</a>
          <a class="tab ${tab === "features" ? "tab-active" : ""}" href="${tabLink("features")}">Features & Appliances</a>
        </div>
      </div>

      <div class="mt16">
        ${tab === "tenants" ? unitTenantsPanel(unitId, tenants)
          : tab === "leases" ? unitLeasesPanel(unitId, leases, tenants)
          : tab === "maintenance" ? unitMaintenancePanel(unitId, maint, maintHistory, features)
          : unitFeaturesPanel(unitId, features)}
      </div>
    `;
  }

  function unitTenantsPanel(unitId, tenants) {
    const rows = tenants.map(t => [
      esc(t.name),
      esc(t.email),
      esc(t.phone || "\u2014"),
      `<button class="btn btn-ghost" data-action="delete-tenant" data-id="${t.id}">Remove</button>`
    ]);

    return `
      <div class="panel">
        <div class="panel-h">Tenants</div>
        <div class="muted small mb12">Manage tenants for this unit. Create a lease to officially assign them.</div>

        <form class="form compact" id="addTenantForUnit">
          <label>Name <input name="name" placeholder="Full name" required></label>
          <label>Email <input name="email" type="email" placeholder="tenant@email.com" required></label>
          <label>Phone <input name="phone" type="tel" placeholder="555-123-4567"></label>
          <button class="btn" type="submit">Add tenant</button>
        </form>

        <div class="mt12">
          ${createTable(["Name", "Email", "Phone", "Actions"], rows)}
        </div>
      </div>
    `;
  }

  function unitLeasesPanel(unitId, leases, tenants) {
    const state = window.Data.db();

    const tenantOptions = tenants.map(t =>
      `<option value="${t.id}">${esc(t.name)}</option>`
    ).join("");

    const activeLeases = leases.filter(l => l.active !== false);
    const leaseRows = activeLeases.map(l => {
      const tenant = tenants.find(t => t.id === l.tenantId);
      const payments = state.payments.filter(p => p.leaseId === l.id);
      const paidCount = payments.filter(p => p.status === PAYMENT_STATUS.PAID).length;

      return [
        esc(tenant?.name || "Unknown"),
        l.start,
        l.end,
        "$" + fmt(l.rent),
        "$" + fmt(l.deposit),
        `${paidCount}/${payments.length} paid`,
        `<button class="btn btn-ghost" data-action="end-lease" data-id="${l.id}">End Lease</button>`
      ];
    });

    const paymentSection = activeLeases.length > 0 ? `
      <div class="panel mt16">
        <div class="panel-h">Payment Tracking</div>
        ${activeLeases.map(lease => {
          const tenant = tenants.find(t => t.id === lease.tenantId);
          const payments = state.payments.filter(p => p.leaseId === lease.id).slice(0, 6);

          const paymentRows = payments.map(p => [
            esc(tenant?.name || "\u2014"),
            p.month,
            "$" + fmt(p.amount),
            pillStatus(p.status),
            `<button class="btn btn-ghost" data-action="toggle-payment" data-id="${p.id}">
              ${p.status === PAYMENT_STATUS.PAID ? "Mark Unpaid" : "Mark Paid"}
            </button>`
          ]);

          return `
            <div class="mb16">
              <div class="muted small mb8"><b>${esc(tenant?.name || "Unknown")}</b> (${lease.start} to ${lease.end})</div>
              ${createTable(["Tenant", "Month", "Amount", "Status", "Action"], paymentRows)}
            </div>
          `;
        }).join("")}
      </div>
    ` : "";

    return `
      <div class="panel">
        <div class="panel-h">Active Leases</div>

        ${activeLeases.length > 0 ? createTable(
          ["Tenant", "Start", "End", "Rent", "Deposit", "Payments", "Actions"],
          leaseRows
        ) : `<div class="muted small">No active leases for this unit.</div>`}

        <div class="mt16">
          <div class="panel-h">Create New Lease</div>
          <form class="form compact mt12" id="addLeaseForUnit">
            <label>Tenant
              <select name="tenantId" required>
                <option value="">Select tenant</option>
                ${tenantOptions}
              </select>
            </label>
            <label>Start date <input name="start" type="date" required></label>
            <label>End date <input name="end" type="date" required></label>
            <label>Monthly rent <input name="rent" type="number" placeholder="0" required></label>
            <label>Security deposit <input name="deposit" type="number" placeholder="0"></label>
            <button class="btn" type="submit">Create lease</button>
          </form>
          <div class="muted small mt8">Creating a lease will automatically generate payment records and mark the unit as occupied.</div>
        </div>
      </div>

      ${paymentSection}
    `;
  }

  function unitMaintenancePanel(unitId, maint, maintHistory, features) {
    const featureOptions = [`<option value="">(optional) Link to a feature</option>`].concat(
      features.map(f => `<option value="${f.id}">${esc(f.category)} \u2022 ${esc(f.name)}</option>`)
    ).join("");

    const rows = maint.map(m => {
      const f = features.find(x => x.id === m.featureId);
      const next = m.status === MAINTENANCE_STATUS.OPEN ? MAINTENANCE_STATUS.IN_PROGRESS : MAINTENANCE_STATUS.COMPLETE;
      return [
        esc(m.title),
        esc(m.category || "\u2014"),
        f ? esc(`${f.category} \u2022 ${f.name}`) : "\u2014",
        priorityBadge(m.priority),
        pillStatus(m.status),
        m.created,
        `<button class="btn btn-ghost" data-action="advance-maintenance" data-id="${m.id}" data-next="${next}">\u2192 ${next}</button>`
      ];
    });

    const historyRows = maintHistory.map(h => {
      const f = features.find(x => x.id === h.featureId);
      return [
        esc(h.title),
        esc(h.category || "\u2014"),
        f ? esc(`${f.category} \u2022 ${f.name}`) : "\u2014",
        h.completed,
        "$" + fmt(h.cost)
      ];
    });

    const categoryOptions = createCategoryOptions(getMaintenanceCategories());

    return `
      <div class="panel">
        <div class="panel-h">Active Maintenance Requests</div>

        <form class="form compact mt12" id="addMaintForUnit">
          <label>Issue description <input name="title" placeholder="e.g., leaking faucet in bathroom" required></label>
          <label>Category
            <select name="category">${categoryOptions}</select>
          </label>
          <label>Priority
            <select name="priority">
              <option>${PRIORITY.LOW}</option>
              <option selected>${PRIORITY.MEDIUM}</option>
              <option>${PRIORITY.HIGH}</option>
            </select>
          </label>
          <label>Related feature (optional)
            <select name="featureId">${featureOptions}</select>
          </label>
          <label>Description <textarea name="description" placeholder="Additional details..."></textarea></label>
          <button class="btn" type="submit">Create request</button>
        </form>

        <div class="mt12">
          ${maint.length > 0 ? createTable(["Issue", "Category", "Feature", "Priority", "Status", "Created", "Action"], rows)
            : `<div class="muted small">No active maintenance requests.</div>`}
        </div>
      </div>

      ${maintHistory.length > 0 ? `
      <div class="panel mt16">
        <div class="panel-h">Maintenance History</div>
        ${createTable(["Issue", "Category", "Feature", "Completed", "Cost"], historyRows)}
      </div>
      ` : ""}
    `;
  }

  function unitFeaturesPanel(unitId, features) {
    const featuresHtml = features.map(f => {
      const hasDetails = f.manufacturer || f.model || f.installDate || f.warrantyExpires || f.lastServiceDate;
      return `
        <div class="feature-card">
          <div class="feature-card-header">
            <div>
              <div class="feature-title">${esc(f.name)}</div>
              <span class="feature-category">${esc(f.category)}</span>
            </div>
            <button class="btn btn-ghost" data-action="delete-feature" data-id="${f.id}">Delete</button>
          </div>
          ${hasDetails ? `
            <div class="feature-details">
              ${f.manufacturer ? `<div class="feature-detail-row"><span class="feature-label">Manufacturer:</span><span class="feature-value">${esc(f.manufacturer)}</span></div>` : ""}
              ${f.model ? `<div class="feature-detail-row"><span class="feature-label">Model:</span><span class="feature-value">${esc(f.model)}</span></div>` : ""}
              ${f.installDate ? `<div class="feature-detail-row"><span class="feature-label">Installed:</span><span class="feature-value">${f.installDate}</span></div>` : ""}
              ${f.warrantyExpires ? `<div class="feature-detail-row"><span class="feature-label">Warranty Expires:</span><span class="feature-value">${f.warrantyExpires}</span></div>` : ""}
              ${f.lastServiceDate ? `<div class="feature-detail-row"><span class="feature-label">Last Service:</span><span class="feature-value">${f.lastServiceDate}</span></div>` : ""}
              ${f.notes ? `<div class="muted small mt8">${esc(f.notes)}</div>` : ""}
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    const categoryOptions = createCategoryOptions(getFeatureCategories());

    return `
      <div class="panel">
        <div class="panel-h">Features & Appliances</div>
        <div class="muted small mb12">Track appliances, systems, and features with warranty and service information.</div>

        <form class="form compact" id="addFeatureForUnit">
          <div class="grid2">
            <label>Category
              <select name="category">${categoryOptions}</select>
            </label>
            <label>Feature name <input name="name" placeholder="e.g., Dishwasher, Hardwood Floors" required></label>
          </div>
          <div class="grid2">
            <label>Manufacturer <input name="manufacturer" placeholder="e.g., Bosch, Whirlpool"></label>
            <label>Model <input name="model" placeholder="e.g., 500 Series"></label>
          </div>
          <div class="grid3">
            <label>Install date <input name="installDate" type="date"></label>
            <label>Warranty expires <input name="warrantyExpires" type="date"></label>
            <label>Last service <input name="lastServiceDate" type="date"></label>
          </div>
          <label>Notes <textarea name="notes" placeholder="Additional information..."></textarea></label>
          <button class="btn" type="submit">Add feature</button>
        </form>

        <div class="mt16 grid2">
          ${features.length > 0 ? featuresHtml : `<div class="muted small">No features added yet.</div>`}
        </div>
      </div>
    `;
  }

  // ===== TOP-LEVEL VIEWS =====

  function viewSearch(query) {
    if (!query) {
      return `
        <div class="panel">
          <div class="muted">Enter a term in the search bar to find properties, units, vendors, tenants, and more.</div>
        </div>
      `;
    }

    const q = query.toLowerCase();
    const state = window.Data.db();

    const propertyById = new Map(state.properties.map(p => [p.id, p]));
    const unitById = new Map(state.units.map(u => [u.id, u]));

    const results = [];

    state.properties.forEach(property => {
      if (`${property.name} ${property.address} ${property.type}`.toLowerCase().includes(q)) {
        results.push({ label: `Property: ${property.name}`, meta: property.address, href: "#properties" });
      }
    });

    state.units.forEach(unit => {
      const property = propertyById.get(unit.propertyId);
      if (`${unit.label} ${unit.tenantName} ${property?.name || ""}`.toLowerCase().includes(q)) {
        results.push({
          label: `Unit: ${property?.name || "Property"} • ${unit.label}`,
          meta: `${unit.status} • $${fmt(unit.rent)}/mo`,
          href: `#unit?unitId=${unit.id}&tab=tenants`
        });
      }
    });

    state.tenants.forEach(tenant => {
      const unit = unitById.get(tenant.unitId);
      const property = unit ? propertyById.get(unit.propertyId) : null;
      if (`${tenant.name} ${tenant.email} ${tenant.phone}`.toLowerCase().includes(q)) {
        results.push({
          label: `Tenant: ${tenant.name}`,
          meta: `${tenant.email} • ${(property?.name || "Property")} ${(unit?.label || "")}`.trim(),
          href: unit ? `#unit?unitId=${unit.id}&tab=tenants` : "#properties"
        });
      }
    });

    state.vendors.forEach(vendor => {
      if (`${vendor.name} ${vendor.email} ${vendor.phone} ${vendor.category}`.toLowerCase().includes(q)) {
        results.push({ label: `Vendor: ${vendor.name}`, meta: `${vendor.category} • ${vendor.email}`, href: "#vendors" });
      }
    });

    state.maintenance.forEach(item => {
      const unit = unitById.get(item.unitId);
      const property = unit ? propertyById.get(unit.propertyId) : null;
      if (`${item.title} ${item.category} ${item.status}`.toLowerCase().includes(q)) {
        results.push({
          label: `Maintenance: ${item.title}`,
          meta: `${item.status} • ${(property?.name || "Property")} ${(unit?.label || "")}`.trim(),
          href: "#maintenance"
        });
      }
    });

    state.notifications.forEach(note => {
      if (`${note.type} ${note.text}`.toLowerCase().includes(q)) {
        results.push({ label: `Notification: ${note.type}`, meta: note.text, href: "#notifications" });
      }
    });

    const deduped = [];
    const seen = new Set();
    results.forEach(result => {
      const id = `${result.label}|${result.meta}|${result.href}`;
      if (!seen.has(id)) {
        seen.add(id);
        deduped.push(result);
      }
    });

    if (deduped.length === 0) {
      return `<div class="panel"><div class="muted">No results found for <b>${esc(query)}</b>.</div></div>`;
    }

    return `
      <div class="panel stack">
        <div class="muted small">${deduped.length} result${deduped.length === 1 ? "" : "s"} found</div>
        <div class="search-results">
          ${deduped.map(result => `
            <a class="search-result" href="${result.href}">
              <div class="search-result-title">${esc(result.label)}</div>
              <div class="muted small">${esc(result.meta)}</div>
            </a>
          `).join("")}
        </div>
      </div>
    `;
  }

  function viewDashboard() {
    const state = window.Data.db();
    const leases = state.leases.filter(l => l.active !== false);
    const expiringSoon = leases.slice().sort((a, b) => (a.end > b.end ? 1 : -1)).slice(0, 5);

    const totalRevenue = leases.reduce((sum, l) => sum + l.rent, 0);
    const activeMaintenanceCount = state.maintenance.length;

    return `
      <div class="grid2">
        <div class="panel">
          <div class="panel-h">Portfolio Summary</div>
          <div class="stack">
            <div>
              <div class="muted small">Total Properties</div>
              <div style="font-size:28px; font-weight:900;">${state.properties.length}</div>
            </div>
            <div>
              <div class="muted small">Total Units</div>
              <div style="font-size:28px; font-weight:900;">${state.units.length}</div>
            </div>
            <div>
              <div class="muted small">Monthly Revenue</div>
              <div style="font-size:28px; font-weight:900;">$${fmt(totalRevenue)}</div>
            </div>
            <div>
              <div class="muted small">Active Maintenance</div>
              <div style="font-size:28px; font-weight:900;">${activeMaintenanceCount}</div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-h">Recent Notifications</div>
          ${state.notifications.slice(0, 5).map(n => `
            <div class="mb8">
              <span class="pill pill-mid">${esc(n.type)}</span>
              <div class="muted small mt8">${esc(n.text)}</div>
              <div class="muted small">${n.created}</div>
            </div>
          `).join("") || `<div class="muted small">No notifications</div>`}
          <a href="#notifications" class="link mt12" style="display:block;">View all notifications \u2192</a>
        </div>
      </div>

      <div class="panel mt16">
        <div class="panel-h">Current Month Rent Status (Jan 2026)</div>
        ${createTable(["Unit", "Tenant", "Amount", "Status"], state.payments.filter(p => p.month === "2026-01").map(p => {
          const lease = state.leases.find(l => l.id === p.leaseId);
          const unit = state.units.find(u => u.id === lease?.unitId);
          const tenant = state.tenants.find(t => t.id === lease?.tenantId);
          return [
            esc(getUnitLabel(unit, state)),
            esc(tenant?.name || "\u2014"),
            "$" + fmt(p.amount),
            pillStatus(p.status)
          ];
        }))}
      </div>

      <div class="panel mt16">
        <div class="panel-h">Leases Expiring Soon</div>
        ${expiringSoon.length > 0 ? createTable(["Unit", "Tenant", "End Date", "Rent"], expiringSoon.map(l => {
          const unit = state.units.find(u => u.id === l.unitId);
          const tenant = state.tenants.find(t => t.id === l.tenantId);
          return [
            esc(getUnitLabel(unit, state)),
            esc(tenant?.name || "\u2014"),
            l.end,
            "$" + fmt(l.rent)
          ];
        })) : `<div class="muted small">No leases expiring in the next 90 days.</div>`}
      </div>
    `;
  }

  function viewProperties() {
    const state = window.Data.db();

    const propertyTypeOptions = createCategoryOptions(getPropertyTypes());

    const props = state.properties.map(p => {
      const units = state.units.filter(u => u.propertyId === p.id);
      const occupiedCount = units.filter(u => u.status === UNIT_STATUS.OCCUPIED).length;
      const showAddUnit = quickAddUnitPropertyId === p.id;

      return `
        <div class="panel">
          <div class="row between">
            <div>
              <div class="panel-h">${esc(p.name)}</div>
              <div class="muted small">${esc(p.address)} • ${esc(p.type)}</div>
            </div>
            <div>
              <span class="pill pill-mid">${units.length} units</span>
              <span class="pill">${occupiedCount} occupied</span>
            </div>
          </div>

          <div class="mt12">
            ${units.length > 0 ? createTable(["Unit", "Status", "Rent", "Sq Ft", "Tenant", "Actions"], units.map(u => [
              esc(u.label),
              pillStatus(u.status),
              "$" + fmt(u.rent),
              fmt(u.sqft),
              esc(u.tenantName || "—"),
              `<button class="btn btn-ghost" data-action="open-unit" data-id="${u.id}">Open</button>
               <button class="btn btn-ghost" data-action="delete-unit" data-id="${u.id}">Delete</button>`
            ])) : `<div class="muted small">No units yet. Use Add Unit to create the first one.</div>`}
          </div>

          <div class="mt12 row">
            <button class="btn btn-ghost" data-action="quick-add-unit" data-property-id="${p.id}">Add Unit</button>
            <button class="btn btn-ghost" data-action="delete-property" data-id="${p.id}">Delete Property</button>
          </div>

          ${showAddUnit ? `
            <div class="mt12">
              <form id="addUnitFromPropertyCard" class="form compact">
                <input type="hidden" name="propertyId" value="${p.id}">
                <label>Unit label <input name="label" placeholder="e.g., 201 or Unit A" required></label>
                <label>Square feet <input name="sqft" type="number" placeholder="0"></label>
                <label>Monthly rent <input name="rent" type="number" placeholder="0" required></label>
                <div class="row">
                  <button class="btn" type="submit">Add unit</button>
                  <button class="btn btn-ghost" type="button" data-action="cancel-quick-add-unit">Cancel</button>
                </div>
              </form>
              <div class="muted small mt8">Tip: Units cannot be deleted if they have an active lease.</div>
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    return `
      <div class="grid2">
        <div class="panel grid-span-2">
          <div class="panel-h">Add New Property</div>
          <form id="addPropertyForm" class="form compact">
            <label>Property name <input name="name" placeholder="e.g., Capitol Hill Apartments" required></label>
            <label>Full address <input name="address" placeholder="123 Main St, City, State ZIP" required></label>
            <label>Property type
              <select name="type">${propertyTypeOptions}</select>
            </label>
            <button class="btn" type="submit">Add property</button>
          </form>
        </div>
      </div>

      <div class="stack mt16">
        ${props || `
          <div class="panel">
            <div class="panel-h">No Properties Yet</div>
            <div class="muted small">Add your first property using the form above to get started.</div>
          </div>
        `}
      </div>
    `;
  }

  function viewMaintenance() {
    const state = window.Data.db();
    const showAddMaintenance = showMaintenanceQuickAdd;

    const filterStatus = document.getElementById("filterStatus")?.value || "all";
    const filterUnit = document.getElementById("filterUnit")?.value || "all";

    let filteredMaint = state.maintenance;
    if (filterStatus !== "all") {
      filteredMaint = filteredMaint.filter(m => m.status === filterStatus);
    }
    if (filterUnit !== "all") {
      filteredMaint = filteredMaint.filter(m => m.unitId === filterUnit);
    }

    const unitOptions = state.units.map(u => {
      const prop = state.properties.find(p => p.id === u.propertyId);
      return `<option value="${u.id}">${esc(prop?.name || "Property")} • ${esc(u.label)}</option>`;
    }).join("");

    const categoryOptions = createCategoryOptions(getMaintenanceCategories());

    const rows = filteredMaint.map(m => {
      const unit = state.units.find(u => u.id === m.unitId);
      const feature = state.unit_features.find(f => f.id === m.featureId);
      const next = m.status === MAINTENANCE_STATUS.OPEN ? MAINTENANCE_STATUS.IN_PROGRESS : MAINTENANCE_STATUS.COMPLETE;

      return [
        esc(getUnitLabel(unit, state)),
        esc(m.title),
        esc(m.category || "—"),
        feature ? esc(`${feature.category} • ${feature.name}`) : "—",
        priorityBadge(m.priority),
        pillStatus(m.status),
        m.created,
        `<button class="btn btn-ghost" data-action="advance-maintenance" data-id="${m.id}" data-next="${next}">→ ${next}</button>`
      ];
    });

    const historyRows = (state.maintenance_history || []).slice().sort((a, b) => (a.completed < b.completed ? 1 : -1)).slice(0, 10).map(h => {
      const unit = state.units.find(u => u.id === h.unitId);
      const feature = state.unit_features.find(f => f.id === h.featureId);
      return [
        esc(getUnitLabel(unit, state)),
        esc(h.title),
        esc(h.category || "—"),
        feature ? esc(`${feature.category} • ${feature.name}`) : "—",
        h.completed,
        "$" + fmt(h.cost)
      ];
    });

    return `
      <div class="grid2">
        <div class="panel grid-span-2">
          <div class="panel-h">Maintenance Statistics</div>
          <div class="stack">
            <div>
              <div class="muted small">Open Requests</div>
              <div style="font-size:24px; font-weight:900;">${state.maintenance.filter(m => m.status === MAINTENANCE_STATUS.OPEN).length}</div>
            </div>
            <div>
              <div class="muted small">In Progress</div>
              <div style="font-size:24px; font-weight:900;">${state.maintenance.filter(m => m.status === MAINTENANCE_STATUS.IN_PROGRESS).length}</div>
            </div>
            <div>
              <div class="muted small">Completed (All Time)</div>
              <div style="font-size:24px; font-weight:900;">${(state.maintenance_history || []).length}</div>
            </div>
            <div>
              <div class="muted small">Total Cost (All Time)</div>
              <div style="font-size:24px; font-weight:900;">$${fmt((state.maintenance_history || []).reduce((sum, m) => sum + (m.cost || 0), 0))}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel mt16">
        <div class="row between mb12">
          <div class="panel-h">Active Maintenance Requests</div>
          <div class="row">
            <button class="btn btn-ghost" data-action="quick-add-maintenance" type="button">Add Request</button>
            <div class="filters">
              <select id="filterStatus" class="filter">
                <option value="all">All Statuses</option>
                <option value="${MAINTENANCE_STATUS.OPEN}">${MAINTENANCE_STATUS.OPEN}</option>
                <option value="${MAINTENANCE_STATUS.IN_PROGRESS}">${MAINTENANCE_STATUS.IN_PROGRESS}</option>
              </select>
              <select id="filterUnit" class="filter">
                <option value="all">All Units</option>
                ${unitOptions}
              </select>
            </div>
          </div>
        </div>

        ${showAddMaintenance ? `
          <form id="addMaintenanceForm" class="form compact mb12">
            <label>Unit
              <select name="unitId" required>
                <option value="">Select unit</option>
                ${unitOptions}
              </select>
            </label>
            <label>Issue description <input name="title" placeholder="e.g., leaking faucet" required></label>
            <label>Category
              <select name="category">${categoryOptions}</select>
            </label>
            <label>Priority
              <select name="priority">
                <option>${PRIORITY.LOW}</option>
                <option selected>${PRIORITY.MEDIUM}</option>
                <option>${PRIORITY.HIGH}</option>
              </select>
            </label>
            <label>Description <textarea name="description" placeholder="Additional details..."></textarea></label>
            <div class="row">
              <button class="btn" type="submit">Create request</button>
              <button class="btn btn-ghost" type="button" data-action="cancel-quick-add-maintenance">Cancel</button>
            </div>
          </form>
        ` : ""}

        ${rows.length > 0 ? createTable(["Unit", "Issue", "Category", "Feature", "Priority", "Status", "Created", "Action"], rows)
          : `<div class="muted small">No active maintenance requests matching the filters.</div>`}
      </div>

      ${historyRows.length > 0 ? `
      <div class="panel mt16">
        <div class="panel-h">Recent Maintenance History (Last 10)</div>
        ${createTable(["Unit", "Issue", "Category", "Feature", "Completed", "Cost"], historyRows)}
      </div>
      ` : ""}
    `;
  }

  function viewVendors() {
    const state = window.Data.db();
    const categoryOptions = createCategoryOptions(getVendorCategories());

    const rows = state.vendors.map(v => [
      esc(v.name),
      esc(v.category || "\u2014"),
      esc(v.phone || "\u2014"),
      esc(v.email || "\u2014"),
      `<button class="btn btn-ghost" data-action="delete-vendor" data-id="${v.id}">Delete</button>`
    ]);

    return `
      <div class="grid2">
        <div class="panel">
          <div class="panel-h">Add Vendor</div>
          <form id="addVendorForm" class="form compact">
            <label>Vendor name <input name="name" placeholder="ABC Plumbing" required></label>
            <label>Category
              <select name="category">${categoryOptions}</select>
            </label>
            <label>Phone <input name="phone" type="tel" placeholder="555-555-5555"></label>
            <label>Email <input name="email" type="email" placeholder="vendor@email.com"></label>
            <button class="btn" type="submit">Add vendor</button>
          </form>
        </div>

        <div class="panel">
          <div class="panel-h">Vendor Directory</div>
          ${state.vendors.length > 0 ? createTable(["Name", "Category", "Phone", "Email", "Action"], rows)
            : `<div class="muted small">No vendors added yet.</div>`}
        </div>
      </div>
    `;
  }

  function viewReports() {
    const state = window.Data.db();

    const totalRevenue = state.leases.filter(l => l.active !== false).reduce((sum, l) => sum + l.rent, 0);
    const janPayments = state.payments.filter(p => p.month === "2026-01");
    const collected = janPayments.filter(p => p.status === PAYMENT_STATUS.PAID).reduce((s, p) => s + p.amount, 0);
    const outstanding = janPayments.filter(p => p.status !== PAYMENT_STATUS.PAID).reduce((s, p) => s + p.amount, 0);

    const maintenanceCosts = (state.maintenance_history || []).reduce((sum, m) => sum + (m.cost || 0), 0);

    const propertyStats = state.properties.map(p => {
      const units = state.units.filter(u => u.propertyId === p.id);
      const occupied = units.filter(u => u.status === UNIT_STATUS.OCCUPIED).length;
      const occupancy = units.length ? Math.round((occupied / units.length) * 100) : 0;
      const revenue = units.filter(u => u.status === UNIT_STATUS.OCCUPIED).reduce((sum, u) => sum + u.rent, 0);

      return [
        esc(p.name),
        String(units.length),
        String(occupied),
        `${occupancy}%`,
        "$" + fmt(revenue)
      ];
    });

    return `
      <div class="panel">
        <div class="panel-h">Financial Summary</div>
        <div class="grid2">
          <div>
            <div class="muted small">Monthly Revenue (All Leases)</div>
            <div style="font-size:32px; font-weight:900; color:var(--accent2);">$${fmt(totalRevenue)}</div>
          </div>
          <div>
            <div class="muted small">Collected (Jan 2026)</div>
            <div style="font-size:32px; font-weight:900; color:#4ade80;">$${fmt(collected)}</div>
          </div>
          <div>
            <div class="muted small">Outstanding (Jan 2026)</div>
            <div style="font-size:32px; font-weight:900; color:#fbbf24;">$${fmt(outstanding)}</div>
          </div>
          <div>
            <div class="muted small">Maintenance Costs (All Time)</div>
            <div style="font-size:32px; font-weight:900; color:#f87171;">$${fmt(maintenanceCosts)}</div>
          </div>
        </div>
      </div>

      <div class="panel mt16">
        <div class="panel-h">Occupancy & Revenue by Property</div>
        ${createTable(["Property", "Units", "Occupied", "Occupancy", "Monthly Revenue"], propertyStats)}
      </div>

      <div class="panel mt16">
        <div class="panel-h">Maintenance Summary</div>
        <div class="grid2">
          <div>
            <div class="muted small">Open Requests</div>
            <div style="font-size:24px; font-weight:900;">${state.maintenance.filter(m => m.status === MAINTENANCE_STATUS.OPEN).length}</div>
          </div>
          <div>
            <div class="muted small">In Progress</div>
            <div style="font-size:24px; font-weight:900;">${state.maintenance.filter(m => m.status === MAINTENANCE_STATUS.IN_PROGRESS).length}</div>
          </div>
          <div>
            <div class="muted small">Completed (All Time)</div>
            <div style="font-size:24px; font-weight:900;">${(state.maintenance_history || []).length}</div>
          </div>
          <div>
            <div class="muted small">Average Cost per Request</div>
            <div style="font-size:24px; font-weight:900;">
              $${(state.maintenance_history || []).length > 0
                ? fmt(Math.round(maintenanceCosts / (state.maintenance_history || []).length))
                : 0}
            </div>
          </div>
        </div>
      </div>

      <div class="info-box mt16">
        Tip: Export features and advanced analytics coming soon to the full version!
      </div>
    `;
  }

  function viewNotifications() {
    const state = window.Data.db();
    const rows = state.notifications
      .slice()
      .sort((a, b) => (a.created < b.created ? 1 : -1))
      .map(n => [
        n.created,
        `<span class="pill pill-mid">${esc(n.type)}</span>`,
        esc(n.text)
      ]);

    return `
      <div class="panel">
        <div class="row between mb12">
          <div class="panel-h">Notifications & Alerts</div>
          <button data-action="clear-notifications" class="btn btn-ghost">Clear All</button>
        </div>
        ${rows.length > 0 ? createTable(["Date", "Type", "Message"], rows)
          : `<div class="muted small">No notifications.</div>`}
      </div>
    `;
  }

  function viewProfile() {
    const profile = window.Data.getProfile(email) || {};
    return `
      <div class="grid2">
        <div class="panel grid-span-2">
          <div class="panel-h">My Profile</div>
          <div class="muted small mb12">Manage your personal and professional information.</div>
        </div>

        <div class="panel">
          <div class="panel-h">Personal Information</div>
          <form id="profileForm" class="form compact mt12">
            <label>Full Name <input name="name" value="${esc(me.name || "")}" required></label>
            <div class="grid2">
              <label>Phone <input name="phone" type="tel" placeholder="555-123-4567" value="${esc(profile.phone || "")}" required></label>
              <label>Secondary Phone <input name="phone2" type="tel" placeholder="555-987-6543" value="${esc(profile.phone2 || "")}"></label>
            </div>
            <label>Date of Birth <input name="dob" type="date" value="${esc(profile.dob || "")}"></label>

            <div class="panel-h mt12">Address</div>
            <label>Street Address <input name="address" placeholder="123 Main St" value="${esc(profile.address || "")}"></label>
            <label>Address Line 2 <input name="address2" placeholder="Apt, Suite, Unit, etc." value="${esc(profile.address2 || "")}"></label>
            <div class="grid3">
              <label>City <input name="city" placeholder="Washington" value="${esc(profile.city || "")}"></label>
              <label>State / Province <input name="state" placeholder="DC" value="${esc(profile.state || "")}"></label>
              <label>ZIP / Postal Code <input name="zip" placeholder="20001" value="${esc(profile.zip || "")}"></label>
            </div>

            <div class="panel-h mt12">Professional Details</div>
            <label>Company <input name="company" placeholder="Your Property Management Company" value="${esc(profile.company || "")}"></label>
            <label>Job Title <input name="jobTitle" placeholder="e.g., Property Manager, Owner" value="${esc(profile.jobTitle || "")}"></label>
            <label>Portfolio Name <input name="portfolioName" placeholder="e.g., DC Metro Portfolio" value="${esc(profile.portfolioName || "")}"></label>
            <label>License / Certification Number <input name="licenseNumber" placeholder="e.g., PM-12345" value="${esc(profile.licenseNumber || "")}"></label>

            <div class="panel-h mt12">Bio</div>
            <label>About Me <textarea name="bio" placeholder="A short bio or description...">${esc(profile.bio || "")}</textarea></label>

            <button class="btn mt12" type="submit">Save Profile</button>
          </form>
        </div>

        <div class="stack">
          <div class="panel">
            <div class="panel-h">Profile Preview</div>
            <div class="profile-preview">
              <div class="avatar-placeholder">${esc((me.name || "U").charAt(0).toUpperCase())}</div>
              <div class="profile-preview-name">${esc(me.name || "—")}</div>
              <div class="muted small">${esc(me.email)}</div>
              <div class="muted small">${getRoleLabel(me.role)}</div>
              ${profile.company ? `<div class="muted small mt8">${esc(profile.company)}</div>` : ""}
              ${profile.jobTitle ? `<div class="muted small">${esc(profile.jobTitle)}</div>` : ""}
              ${profile.phone ? `<div class="muted small mt8">${esc(profile.phone)}</div>` : ""}
            </div>
          </div>

          <div class="panel">
            <div class="panel-h">Emergency Contact</div>
            <form id="emergencyContactForm" class="form compact mt12">
              <label>Contact Name <input name="emergencyName" placeholder="Full name" value="${esc(profile.emergencyName || "")}"></label>
              <label>Relationship <input name="emergencyRelation" placeholder="e.g., Spouse, Sibling" value="${esc(profile.emergencyRelation || "")}"></label>
              <label>Phone <input name="emergencyPhone" type="tel" placeholder="555-000-0000" value="${esc(profile.emergencyPhone || "")}"></label>
              <label>Email <input name="emergencyEmail" type="email" placeholder="contact@email.com" value="${esc(profile.emergencyEmail || "")}"></label>
              <button class="btn" type="submit">Save Emergency Contact</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  function viewSettings() {
    const profile = window.Data.getProfile(email) || {};
    const settings = profile.settings || {};

    return `
      <div class="grid2">
        <div class="panel grid-span-2">
          <div class="panel-h">My Settings</div>
          <div class="muted small mb12">Customize your HomeManager experience.</div>
        </div>

        <div class="panel">
          <div class="panel-h">Notification Preferences</div>
          <form id="settingsForm" class="form compact mt12">
            <div class="setting-group">
              <label class="setting-row">
                <span class="setting-label">
                  <span class="setting-title">Email Notifications</span>
                  <span class="muted small">Receive email alerts for important events</span>
                </span>
                <input type="checkbox" name="emailNotifications" class="toggle-checkbox" ${settings.emailNotifications !== false ? "checked" : ""}>
              </label>
              <label class="setting-row">
                <span class="setting-label">
                  <span class="setting-title">Maintenance Alerts</span>
                  <span class="muted small">Get notified when maintenance requests are created or updated</span>
                </span>
                <input type="checkbox" name="maintenanceAlerts" class="toggle-checkbox" ${settings.maintenanceAlerts !== false ? "checked" : ""}>
              </label>
              <label class="setting-row">
                <span class="setting-label">
                  <span class="setting-title">Payment Reminders</span>
                  <span class="muted small">Receive reminders for upcoming and overdue payments</span>
                </span>
                <input type="checkbox" name="paymentReminders" class="toggle-checkbox" ${settings.paymentReminders !== false ? "checked" : ""}>
              </label>
              <label class="setting-row">
                <span class="setting-label">
                  <span class="setting-title">Lease Expiration Warnings</span>
                  <span class="muted small">Get alerts before leases expire</span>
                </span>
                <input type="checkbox" name="leaseAlerts" class="toggle-checkbox" ${settings.leaseAlerts !== false ? "checked" : ""}>
              </label>
            </div>

            <div class="panel-h mt12">Display Preferences</div>
            <label>Currency Format
              <select name="currency">
                <option value="USD" ${settings.currency === "USD" || !settings.currency ? "selected" : ""}>USD ($)</option>
                <option value="EUR" ${settings.currency === "EUR" ? "selected" : ""}>EUR (\u20AC)</option>
                <option value="GBP" ${settings.currency === "GBP" ? "selected" : ""}>GBP (\u00A3)</option>
                <option value="CAD" ${settings.currency === "CAD" ? "selected" : ""}>CAD (C$)</option>
                <option value="AUD" ${settings.currency === "AUD" ? "selected" : ""}>AUD (A$)</option>
              </select>
            </label>
            <label>Date Format
              <select name="dateFormat">
                <option value="MM/DD/YYYY" ${settings.dateFormat === "MM/DD/YYYY" || !settings.dateFormat ? "selected" : ""}>MM/DD/YYYY</option>
                <option value="DD/MM/YYYY" ${settings.dateFormat === "DD/MM/YYYY" ? "selected" : ""}>DD/MM/YYYY</option>
                <option value="YYYY-MM-DD" ${settings.dateFormat === "YYYY-MM-DD" ? "selected" : ""}>YYYY-MM-DD</option>
              </select>
            </label>
            <label>Timezone
              <select name="timezone">
                <option value="America/New_York" ${settings.timezone === "America/New_York" || !settings.timezone ? "selected" : ""}>Eastern Time (ET)</option>
                <option value="America/Chicago" ${settings.timezone === "America/Chicago" ? "selected" : ""}>Central Time (CT)</option>
                <option value="America/Denver" ${settings.timezone === "America/Denver" ? "selected" : ""}>Mountain Time (MT)</option>
                <option value="America/Los_Angeles" ${settings.timezone === "America/Los_Angeles" ? "selected" : ""}>Pacific Time (PT)</option>
                <option value="America/Anchorage" ${settings.timezone === "America/Anchorage" ? "selected" : ""}>Alaska Time (AKT)</option>
                <option value="Pacific/Honolulu" ${settings.timezone === "Pacific/Honolulu" ? "selected" : ""}>Hawaii Time (HT)</option>
                <option value="Europe/London" ${settings.timezone === "Europe/London" ? "selected" : ""}>GMT / London</option>
                <option value="Europe/Paris" ${settings.timezone === "Europe/Paris" ? "selected" : ""}>CET / Paris</option>
              </select>
            </label>
            <label>Items Per Page
              <select name="pageSize">
                <option value="10" ${settings.pageSize === "10" || !settings.pageSize ? "selected" : ""}>10</option>
                <option value="25" ${settings.pageSize === "25" ? "selected" : ""}>25</option>
                <option value="50" ${settings.pageSize === "50" ? "selected" : ""}>50</option>
                <option value="100" ${settings.pageSize === "100" ? "selected" : ""}>100</option>
              </select>
            </label>

            <div class="panel-h mt12">Default View</div>
            <label>Dashboard Default View
              <select name="defaultView">
                <option value="dashboard" ${settings.defaultView === "dashboard" || !settings.defaultView ? "selected" : ""}>Dashboard</option>
                <option value="properties" ${settings.defaultView === "properties" ? "selected" : ""}>Properties</option>
                <option value="maintenance" ${settings.defaultView === "maintenance" ? "selected" : ""}>Maintenance</option>
                <option value="reports" ${settings.defaultView === "reports" ? "selected" : ""}>Reports</option>
              </select>
            </label>

            <button class="btn mt12" type="submit">Save Settings</button>
          </form>
        </div>

        <div class="stack">
          <div class="panel">
            <div class="panel-h">Sidebar Behavior</div>
            <div class="muted small mb12">Control the sidebar display on application load.</div>
            <button class="btn btn-ghost" data-action="reset-sidebar">Reset Sidebar State</button>
          </div>

          <div class="panel">
            <div class="panel-h">Data Export</div>
            <div class="muted small mb12">Download a backup of your data as a JSON file.</div>
            <button class="btn btn-ghost" data-action="export-data">Export All Data</button>
          </div>

          <div class="panel">
            <div class="panel-h">Data Management</div>
            <div class="warning-box mb12">
              Warning: These actions are destructive and cannot be undone.
            </div>
            <div class="stack">
              <button class="btn btn-ghost" data-action="reset-demo-data">Reset to Demo Data</button>
              <button class="btn btn-ghost btn-danger" data-action="clear-all-data">Clear All Data</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function viewAccount() {
    const profile = window.Data.getProfile(email) || {};
    const state = window.Data.db();

    // Storage usage estimate
    const storageUsed = new Blob([JSON.stringify(localStorage)]).size;
    const storageFormatted = storageUsed > 1024 * 1024
      ? (storageUsed / (1024 * 1024)).toFixed(2) + " MB"
      : (storageUsed / 1024).toFixed(1) + " KB";

    // Data stats
    const totalProperties = state.properties.length;
    const totalUnits = state.units.length;
    const totalTenants = state.tenants.length;
    const totalLeases = state.leases.length;
    const totalMaintenance = state.maintenance.length + (state.maintenance_history || []).length;
    const totalVendors = state.vendors.length;

    return `
      <div class="grid2">
        <div class="panel grid-span-2">
          <div class="panel-h">My Account</div>
          <div class="muted small mb12">Manage your account details, security, and preferences.</div>
        </div>

        <div class="panel">
          <div class="panel-h">Account Information</div>
          <div class="stack">
            <div class="account-info-row">
              <div class="avatar-placeholder avatar-lg">${esc((me.name || "U").charAt(0).toUpperCase())}</div>
              <div>
                <div class="profile-preview-name">${esc(me.name || "\u2014")}</div>
                <div class="muted small">${esc(me.email)}</div>
                <div class="muted small">${getRoleLabel(me.role)}</div>
              </div>
            </div>
            <div class="detail-grid">
              <div>
                <div class="muted small">Company</div>
                <div><b>${esc(profile.company || "Not set")}</b></div>
              </div>
              <div>
                <div class="muted small">Job Title</div>
                <div><b>${esc(profile.jobTitle || "Not set")}</b></div>
              </div>
              <div>
                <div class="muted small">Phone</div>
                <div><b>${esc(profile.phone || "Not set")}</b></div>
              </div>
              <div>
                <div class="muted small">Portfolio</div>
                <div><b>${esc(profile.portfolioName || "Not set")}</b></div>
              </div>
              <div>
                <div class="muted small">City</div>
                <div><b>${esc(profile.city || "Not set")}</b></div>
              </div>
              <div>
                <div class="muted small">State</div>
                <div><b>${esc(profile.state || "Not set")}</b></div>
              </div>
            </div>
          </div>
          <a href="#profile" class="btn btn-ghost mt12" style="display:inline-block;">Edit Profile</a>
        </div>

        <div class="panel">
          <div class="panel-h">Security</div>
          <div class="stack">
            <div>
              <div class="panel-h" style="font-size:14px;">Change Password</div>
              <form id="changePasswordForm" class="form compact">
                <label>Current Password <input name="currentPassword" type="password" placeholder="Enter current password" required></label>
                <label>New Password <input name="newPassword" type="password" placeholder="Enter new password (min 6 chars)" required></label>
                <label>Confirm New Password <input name="confirmPassword" type="password" placeholder="Confirm new password" required></label>
                <button class="btn" type="submit">Update Password</button>
              </form>
            </div>
            <div class="setting-group mt12">
              <div class="setting-row">
                <span class="setting-label">
                  <span class="setting-title">Two-Factor Authentication</span>
                  <span class="muted small">Add an extra layer of security to your account</span>
                </span>
                <span class="pill pill-mid">Coming Soon</span>
              </div>
              <div class="setting-row">
                <span class="setting-label">
                  <span class="setting-title">Login History</span>
                  <span class="muted small">View recent sign-in activity</span>
                </span>
                <span class="pill pill-mid">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid2 mt16">
        <div class="panel">
          <div class="panel-h">Data Overview</div>
          <div class="muted small mb12">Summary of all records in your account.</div>
          <div class="detail-grid">
            <div>
              <div class="muted small">Properties</div>
              <div style="font-size:22px; font-weight:900;">${totalProperties}</div>
            </div>
            <div>
              <div class="muted small">Units</div>
              <div style="font-size:22px; font-weight:900;">${totalUnits}</div>
            </div>
            <div>
              <div class="muted small">Tenants</div>
              <div style="font-size:22px; font-weight:900;">${totalTenants}</div>
            </div>
            <div>
              <div class="muted small">Leases</div>
              <div style="font-size:22px; font-weight:900;">${totalLeases}</div>
            </div>
            <div>
              <div class="muted small">Maintenance Records</div>
              <div style="font-size:22px; font-weight:900;">${totalMaintenance}</div>
            </div>
            <div>
              <div class="muted small">Vendors</div>
              <div style="font-size:22px; font-weight:900;">${totalVendors}</div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-h">System Information</div>
          <div class="muted small mb12">Technical details about this application.</div>
          <div class="stack">
            <div>
              <div class="muted small">Data Storage</div>
              <div><b>Browser localStorage</b></div>
            </div>
            <div>
              <div class="muted small">Storage Used</div>
              <div><b>${storageFormatted}</b></div>
            </div>
            <div>
              <div class="muted small">Version</div>
              <div><b>HomeManager v2.0 (Enhanced)</b></div>
            </div>
            <div>
              <div class="muted small">Last Updated</div>
              <div><b>February 2026</b></div>
            </div>
            <div>
              <div class="muted small">Browser</div>
              <div><b>${esc(navigator.userAgent.split(" ").pop() || "Unknown")}</b></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid2 mt16">
        <div class="panel">
          <div class="panel-h">Connected Services</div>
          <div class="muted small mb12">Integrations and third-party connections.</div>
          <div class="setting-group">
            <div class="setting-row">
              <span class="setting-label">
                <span class="setting-title">Stripe / Payment Processing</span>
                <span class="muted small">Automate rent collection and payment tracking</span>
              </span>
              <span class="pill pill-mid">Coming Soon</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">
                <span class="setting-title">QuickBooks / Accounting</span>
                <span class="muted small">Sync financial data with your accounting software</span>
              </span>
              <span class="pill pill-mid">Coming Soon</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">
                <span class="setting-title">Email / SMS Provider</span>
                <span class="muted small">Send automated notifications to tenants</span>
              </span>
              <span class="pill pill-mid">Coming Soon</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">
                <span class="setting-title">Document Storage</span>
                <span class="muted small">Store leases, contracts, and receipts</span>
              </span>
              <span class="pill pill-mid">Coming Soon</span>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-h">Danger Zone</div>
          <div class="warning-box mb12">
            These actions are permanent and cannot be undone. Proceed with caution.
          </div>
          <div class="stack">
            <div>
              <div class="muted small mb8">Deactivate Account</div>
              <div class="muted small mb8">Temporarily disable your account. You can reactivate by logging in again.</div>
              <button class="btn btn-ghost" data-action="deactivate-account">Deactivate Account</button>
            </div>
            <div>
              <div class="muted small mb8">Delete Account</div>
              <div class="muted small mb8">Permanently delete your account and all associated data.</div>
              <button class="btn btn-ghost btn-danger" data-action="delete-account">Delete Account</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
})();
