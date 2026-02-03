(function () {
  if (!window.Auth.isAuthed()) {
    window.location.href = "./index.html";
    return;
  }

  window.Data.bootstrap();

  const me = window.Auth.me();
  const role = me.role;
  const email = me.email;

  const navEl = document.getElementById("nav");
  const viewEl = document.getElementById("view");
  const whoEl = document.getElementById("who");
  const roleBadge = document.getElementById("roleBadge");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  const kpiPills = document.getElementById("kpiPills");

  whoEl.textContent = me.email;
  roleBadge.textContent = roleLabel(role);

  // Sidebar toggle functionality
  const sidebarToggle = document.getElementById("sidebarToggle");
  const appEl = document.querySelector(".app");
  let sidebarCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
  
  if (sidebarCollapsed) {
    appEl.classList.add("sidebar-collapsed");
  }
  
  sidebarToggle.addEventListener("click", () => {
    sidebarCollapsed = !sidebarCollapsed;
    appEl.classList.toggle("sidebar-collapsed");
    localStorage.setItem("sidebar_collapsed", sidebarCollapsed);
  });

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
  });
  
  userMenuDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Logout from top menu
  document.getElementById("logoutBtnTop").addEventListener("click", () => {
    window.Auth.logout();
    window.location.href = "./index.html";
  });

  const routes = getRoutesForRole(role);

  window.addEventListener("hashchange", render);
  render();

  function parseHash() {
    const raw = (window.location.hash || "#dashboard").slice(1);
    const [key, qs] = raw.split("?");
    const params = new URLSearchParams(qs || "");
    return { key: key || "dashboard", params };
  }

  function render() {
    const profile = window.Data.getProfile(email);
    const { key, params } = parseHash();

    // Always render navigation
    renderNav(routes);

    // Dynamic Unit route
    if (key === "unit") {
      const unitId = params.get("unitId");
      const tab = params.get("tab") || "tenants";

      renderKpis();
      pageTitle.textContent = "Unit Detail";
      pageSubtitle.textContent = "Tenants • Leases • Maintenance • Features";

      viewEl.innerHTML = viewUnitDetail(unitId, tab);
      wireUnitDetail(unitId, tab);

      highlightNavUnit(unitId);
      highlightTopNav(null);
      return;
    }

    const match = routes.find(r => r.key === key) || routes[0];

    renderKpis();
    pageTitle.textContent = match.title;
    pageSubtitle.textContent = match.subtitle || "";

    viewEl.innerHTML = match.render();
    wireActions(match.key);

    highlightTopNav(match.key);
    highlightNavUnit(null);
  }

  function highlightTopNav(routeKey) {
    [...navEl.querySelectorAll("a[data-key]")].forEach(a => {
      a.classList.toggle("active", a.dataset.key === routeKey);
    });
  }

  function highlightNavUnit(unitId) {
    [...navEl.querySelectorAll(".navitem-child[data-unit]")].forEach(a => {
      a.classList.toggle("active", unitId && a.getAttribute("data-unit") === unitId);
    });
  }

  function renderNav(items) {
    const state = window.Data.db();
    const { key, params } = parseHash();
    const activeUnitId = key === "unit" ? params.get("unitId") : null;

    // Get all units across all properties for simple list
    const allUnits = state.units.map(u => {
      const prop = state.properties.find(p => p.id === u.propertyId);
      return { ...u, propertyName: prop?.name || "Unknown Property" };
    });

    const unitsHtml = allUnits.map(u => `
      <a class="navitem navitem-child ${activeUnitId===u.id ? "active":""}"
         href="#unit?unitId=${u.id}&tab=tenants"
         data-unit="${u.id}">
        <span class="dot dot-child"></span>
        <span>${esc(u.propertyName)} • ${esc(u.label)}</span>
      </a>
    `).join("");

    navEl.innerHTML = `
      ${items.map(i => `
        <a class="navitem" href="#${i.key}" data-key="${i.key}">
          <span class="dot"></span><span>${i.title}</span>
        </a>
      `).join("")}

      <div class="navsection-title">Units</div>
      <div class="units-list">
        ${unitsHtml || `<div class="muted small">No units yet — add from Properties page.</div>`}
      </div>
    `;
  }

  function renderKpis() {
    const state = window.Data.db();

    const totalUnits = state.units.length;
    const occupied = state.units.filter(u => u.status === "Occupied").length;
    const occupancy = totalUnits ? Math.round((occupied / totalUnits) * 100) : 0;

    const jan = state.payments.filter(p => p.month === "2026-01");
    const collected = jan.filter(p => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
    const overdue = jan.filter(p => p.status !== "Paid").length;

    kpiPills.innerHTML = `
      <span class="kpi">Occupancy: <b>${occupancy}%</b></span>
      <span class="kpi">Collected: <b>$${fmt(collected)}</b></span>
      <span class="kpi">Overdue: <b>${overdue}</b></span>
    `;
  }

  function getRoutesForRole(role) {
    return [
      { key: "dashboard", title: "Dashboard", subtitle: "Portfolio overview", render: viewDashboard },
      { key: "properties", title: "Properties", subtitle: "Manage properties and units", render: viewProperties },
      { key: "maintenance", title: "Maintenance", subtitle: "Track and schedule maintenance", render: viewMaintenance },
      { key: "vendors", title: "Vendors", subtitle: "Preferred vendors and contacts", render: viewVendors },
      { key: "reports", title: "Reports", subtitle: "Financial and operational reports", render: viewReports },
      { key: "notifications", title: "Notifications", subtitle: "Alerts and reminders", render: viewNotifications }
    ];
  }

  function wireActions(key) {
    const state = window.Data.db();

    if (key === "properties") {
      const propForm = document.getElementById("addPropertyForm");
      propForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = propForm.name.value.trim();
        const address = propForm.address.value.trim();
        const type = propForm.type.value;
        if (!name || !address) return;

        const id = "p" + Math.random().toString(16).slice(2, 8);
        window.Data.add("properties", { id, name, address, type });
        window.location.reload();
      });

      const unitForm = document.getElementById("addUnitFromProperties");
      unitForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const propertyId = unitForm.propertyId.value;
        const label = unitForm.label.value.trim();
        const sqft = Number(unitForm.sqft.value || 0);
        const rent = Number(unitForm.rent.value || 0);
        if (!propertyId || !label) return alert("Property and unit label are required.");

        const id = "u" + Math.random().toString(16).slice(2, 8);
        window.Data.add("units", {
          id, propertyId, label, sqft, rent,
          status: "Vacant",
          tenantName: "",
          leaseActive: false
        });
        window.location.reload();
      });

      document.querySelectorAll("[data-delete-unit]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-delete-unit");
          const unit = state.units.find(u => u.id === id);
          if (!unit) return;

          if (unit.leaseActive) {
            alert("This unit cannot be deleted because it has an active lease.");
            return;
          }

          if (!confirm(`Delete ${unit.label}?`)) return;
          
          // Also delete related features and maintenance
          state.unit_features.filter(f => f.unitId === id).forEach(f => {
            window.Data.remove("unit_features", f.id);
          });
          state.maintenance.filter(m => m.unitId === id).forEach(m => {
            window.Data.remove("maintenance", m.id);
          });
          
          window.Data.remove("units", id);
          window.location.reload();
        });
      });

      document.querySelectorAll("[data-open-unit]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-open-unit");
          window.location.hash = `#unit?unitId=${id}&tab=tenants`;
        });
      });

      document.querySelectorAll("[data-delete-property]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-delete-property");
          const units = state.units.filter(u => u.propertyId === id);
          
          if (units.length > 0) {
            alert("Cannot delete property with units. Delete all units first.");
            return;
          }

          if (!confirm("Delete this property?")) return;
          window.Data.remove("properties", id);
          window.location.reload();
        });
      });
    }

    if (key === "vendors") {
      const form = document.getElementById("addVendorForm");
      form?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = form.name.value.trim();
        const category = form.category.value;
        const phone = form.phone.value.trim();
        const emailV = form.email.value.trim();

        if (!name) return alert("Vendor name is required.");

        const id = "v" + Math.random().toString(16).slice(2, 8);
        window.Data.add("vendors", { id, name, category, phone, email: emailV });
        window.location.reload();
      });

      document.querySelectorAll("[data-del-vendor]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-del-vendor");
          if (!confirm("Delete this vendor?")) return;
          window.Data.remove("vendors", id);
          window.location.reload();
        });
      });
    }

    if (key === "maintenance") {
      // Add maintenance from main maintenance page
      const form = document.getElementById("addMaintenanceForm");
      form?.addEventListener("submit", (e) => {
        e.preventDefault();
        const unitId = form.unitId.value;
        const title = form.title.value.trim();
        const category = form.category.value;
        const priority = form.priority.value;
        const description = form.description.value.trim();
        
        if (!unitId || !title) return alert("Unit and title are required.");

        const id = "m" + Math.random().toString(16).slice(2, 8);
        window.Data.add("maintenance", {
          id, unitId, title, category, priority, description,
          status: "Open",
          created: today(),
          vendorId: "",
          featureId: ""
        });

        window.Data.add("notifications", {
          id: "n" + id,
          type: "Maintenance",
          text: `New maintenance request: ${title}`,
          created: today()
        });

        window.location.reload();
      });

      // Filter functionality
      document.getElementById("filterStatus")?.addEventListener("change", () => {
        render();
      });
      document.getElementById("filterUnit")?.addEventListener("change", () => {
        render();
      });

      // Advance maintenance status
      document.querySelectorAll("[data-maint-advance]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-maint-advance");
          const next = btn.getAttribute("data-next");
          const item = state.maintenance.find(m => m.id === id);
          if (!item) return;

          if (next === "Complete") {
            const costStr = prompt("Enter completion cost (optional):", "0");
            const cost = Number(costStr) || 0;
            
            const histId = "mh" + Math.random().toString(16).slice(2, 8);
            window.Data.add("maintenance_history", {
              id: histId,
              unitId: item.unitId,
              title: item.title,
              category: item.category,
              status: "Complete",
              cost: cost,
              vendorId: item.vendorId || "",
              featureId: item.featureId || "",
              completed: today()
            });
            window.Data.remove("maintenance", item.id);
          } else {
            window.Data.upsert("maintenance", { ...item, status: next });
          }

          window.location.reload();
        });
      });
    }

    if (key === "notifications") {
      document.getElementById("clearNotifications")?.addEventListener("click", () => {
        if (!confirm("Clear all notifications?")) return;
        window.Data.write(state => {
          state.notifications = [];
        });
        window.location.reload();
      });
    }
  }

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
            <div class="panel-h">${esc(prop?.name || "Property")} • ${esc(unit.label)}</div>
            <div class="muted small">Address: ${esc(prop?.address || "—")} | ${unit.sqft} sqft | $${fmt(unit.rent)}/mo</div>
          </div>
          <div>
            ${pillStatus(unit.status)}
          </div>
        </div>

        <div class="tabs mt12">
          <a class="tab ${tab==="tenants"?"tab-active":""}" href="${tabLink("tenants")}">Tenants</a>
          <a class="tab ${tab==="leases"?"tab-active":""}" href="${tabLink("leases")}">Leases</a>
          <a class="tab ${tab==="maintenance"?"tab-active":""}" href="${tabLink("maintenance")}">Maintenance</a>
          <a class="tab ${tab==="features"?"tab-active":""}" href="${tabLink("features")}">Features & Appliances</a>
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

  function wireUnitDetail(unitId, tab) {
    const state = window.Data.db();

    const tenantForm = document.getElementById("addTenantForUnit");
    tenantForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = tenantForm.name.value.trim();
      const emailT = tenantForm.email.value.trim().toLowerCase();
      const phone = tenantForm.phone.value.trim();
      if (!name || !emailT) return;

      window.Data.add("tenants", { 
        id: "t" + Math.random().toString(16).slice(2, 8), 
        name, 
        email: emailT, 
        phone: phone || "",
        unitId 
      });
      window.location.reload();
    });

    document.querySelectorAll("[data-delete-tenant]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-delete-tenant");
        if (!confirm("Delete this tenant?")) return;
        window.Data.remove("tenants", id);
        window.location.reload();
      });
    });

    const featureForm = document.getElementById("addFeatureForUnit");
    featureForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const category = featureForm.category.value;
      const name = featureForm.name.value.trim();
      const manufacturer = featureForm.manufacturer.value.trim();
      const model = featureForm.model.value.trim();
      const installDate = featureForm.installDate.value;
      const warrantyExpires = featureForm.warrantyExpires.value;
      const lastServiceDate = featureForm.lastServiceDate.value;
      const notes = featureForm.notes.value.trim();
      
      if (!name) return alert("Feature name is required.");

      window.Data.add("unit_features", { 
        id: "f" + Math.random().toString(16).slice(2, 8), 
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
      window.location.reload();
    });

    document.querySelectorAll("[data-delete-feature]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-delete-feature");
        if (!confirm("Delete this feature?")) return;
        window.Data.remove("unit_features", id);
        window.location.reload();
      });
    });

    const maintForm = document.getElementById("addMaintForUnit");
    maintForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = maintForm.title.value.trim();
      const category = maintForm.category.value;
      const priority = maintForm.priority.value;
      const featureId = maintForm.featureId.value || "";
      const description = maintForm.description.value.trim();
      if (!title) return;

      window.Data.add("maintenance", {
        id: "m" + Math.random().toString(16).slice(2, 8),
        unitId,
        title,
        category,
        priority,
        description,
        featureId,
        status: "Open",
        created: today(),
        vendorId: ""
      });

      window.Data.add("notifications", {
        id: "n" + Math.random().toString(16).slice(2, 8),
        type: "Maintenance",
        text: `New maintenance request: ${title}`,
        created: today()
      });

      window.location.reload();
    });

    document.querySelectorAll("[data-maint-advance]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-maint-advance");
        const next = btn.getAttribute("data-next");
        const item = state.maintenance.find(m => m.id === id);
        if (!item) return;

        if (next === "Complete") {
          const costStr = prompt("Enter completion cost (optional):", "0");
          const cost = Number(costStr) || 0;
          
          const histId = "mh" + Math.random().toString(16).slice(2, 8);
          window.Data.add("maintenance_history", {
            id: histId,
            unitId: item.unitId,
            title: item.title,
            category: item.category,
            status: "Complete",
            cost: cost,
            vendorId: item.vendorId || "",
            featureId: item.featureId || "",
            completed: today()
          });
          window.Data.remove("maintenance", item.id);
        } else {
          window.Data.upsert("maintenance", { ...item, status: next });
        }

        window.location.reload();
      });
    });

    const leaseForm = document.getElementById("addLeaseForUnit");
    leaseForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const tenantId = leaseForm.tenantId.value;
      const start = leaseForm.start.value;
      const end = leaseForm.end.value;
      const rent = Number(leaseForm.rent.value || 0);
      const deposit = Number(leaseForm.deposit.value || 0);

      if (!tenantId || !start || !end || !rent) {
        return alert("Please fill all required fields.");
      }

      const leaseId = "l" + Math.random().toString(16).slice(2, 8);
      window.Data.add("leases", {
        id: leaseId,
        unitId,
        tenantId,
        start,
        end,
        rent,
        deposit
      });

      // Update unit status
      const unit = state.units.find(u => u.id === unitId);
      const tenant = state.tenants.find(t => t.id === tenantId);
      if (unit && tenant) {
        window.Data.upsert("units", {
          ...unit,
          status: "Occupied",
          tenantName: tenant.name,
          leaseActive: true
        });
      }

      // Create payment records for the lease duration
      createPaymentRecords(leaseId, start, end, rent);

      window.location.reload();
    });

    document.querySelectorAll("[data-end-lease]").forEach(btn => {
      btn.addEventListener("click", () => {
        const leaseId = btn.getAttribute("data-end-lease");
        const lease = state.leases.find(l => l.id === leaseId);
        if (!lease) return;

        if (!confirm("End this lease? Unit will be marked as vacant.")) return;

        // Update unit status
        const unit = state.units.find(u => u.id === lease.unitId);
        if (unit) {
          window.Data.upsert("units", {
            ...unit,
            status: "Vacant",
            tenantName: "",
            leaseActive: false
          });
        }

        // Mark lease as inactive
        window.Data.upsert("leases", { ...lease, active: false });

        window.location.reload();
      });
    });

    document.querySelectorAll("[data-toggle-payment]").forEach(btn => {
      btn.addEventListener("click", () => {
        const paymentId = btn.getAttribute("data-toggle-payment");
        const payment = state.payments.find(p => p.id === paymentId);
        if (!payment) return;

        const newStatus = payment.status === "Paid" ? "Unpaid" : "Paid";
        window.Data.upsert("payments", { ...payment, status: newStatus });
        window.location.reload();
      });
    });
  }

  function createPaymentRecords(leaseId, startDate, endDate, rent) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (current <= end) {
      const month = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      
      const paymentId = "pay" + Math.random().toString(16).slice(2, 8);
      window.Data.add("payments", {
        id: paymentId,
        leaseId: leaseId,
        month: month,
        amount: rent,
        status: "Unpaid"
      });
      
      current.setMonth(current.getMonth() + 1);
    }
  }

  function unitTenantsPanel(unitId, tenants) {
    const rows = tenants.map(t => [
      esc(t.name),
      esc(t.email),
      esc(t.phone || "—"),
      `<button class="btn btn-ghost" data-delete-tenant="${t.id}">Remove</button>`
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
          ${tableHtml(["Name","Email","Phone","Actions"], rows)}
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
      const paidCount = payments.filter(p => p.status === "Paid").length;
      
      return [
        esc(tenant?.name || "Unknown"),
        l.start,
        l.end,
        "$" + fmt(l.rent),
        "$" + fmt(l.deposit),
        `${paidCount}/${payments.length} paid`,
        `<button class="btn btn-ghost" data-end-lease="${l.id}">End Lease</button>`
      ];
    });

    // Payment tracking for active leases
    const paymentSection = activeLeases.length > 0 ? `
      <div class="panel mt16">
        <div class="panel-h">Payment Tracking</div>
        ${activeLeases.map(lease => {
          const tenant = tenants.find(t => t.id === lease.tenantId);
          const payments = state.payments.filter(p => p.leaseId === lease.id).slice(0, 6);
          
          const paymentRows = payments.map(p => [
            esc(tenant?.name || "—"),
            p.month,
            "$" + fmt(p.amount),
            pillStatus(p.status),
            `<button class="btn btn-ghost" data-toggle-payment="${p.id}">
              ${p.status === "Paid" ? "Mark Unpaid" : "Mark Paid"}
            </button>`
          ]);

          return `
            <div class="mb16">
              <div class="muted small mb8"><b>${esc(tenant?.name || "Unknown")}</b> (${lease.start} to ${lease.end})</div>
              ${tableHtml(["Tenant","Month","Amount","Status","Action"], paymentRows)}
            </div>
          `;
        }).join("")}
      </div>
    ` : "";

    return `
      <div class="panel">
        <div class="panel-h">Active Leases</div>
        
        ${activeLeases.length > 0 ? tableHtml(
          ["Tenant","Start","End","Rent","Deposit","Payments","Actions"], 
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
      features.map(f => `<option value="${f.id}">${esc(f.category)} • ${esc(f.name)}</option>`)
    ).join("");

    const rows = maint.map(m => {
      const f = features.find(x => x.id === m.featureId);
      const next = m.status === "Open" ? "In Progress" : "Complete";
      const priorityBadge = m.priority === "High" ? "pill-warn" : m.priority === "Medium" ? "pill-mid" : "pill-ok";
      return [
        esc(m.title),
        esc(m.category || "—"),
        f ? esc(`${f.category} • ${f.name}`) : "—",
        `<span class="pill ${priorityBadge}">${esc(m.priority || "Low")}</span>`,
        pillStatus(m.status),
        m.created,
        `<button class="btn btn-ghost" data-maint-advance="${m.id}" data-next="${next}">→ ${next}</button>`
      ];
    });

    const historyRows = maintHistory.map(h => {
      const f = features.find(x => x.id === h.featureId);
      return [
        esc(h.title),
        esc(h.category || "—"),
        f ? esc(`${f.category} • ${f.name}`) : "—",
        h.completed,
        "$" + fmt(h.cost)
      ];
    });

    return `
      <div class="panel">
        <div class="panel-h">Active Maintenance Requests</div>

        <form class="form compact mt12" id="addMaintForUnit">
          <label>Issue description <input name="title" placeholder="e.g., leaking faucet in bathroom" required></label>
          <label>Category
            <select name="category">
              <option>General</option><option>HVAC</option><option>Plumbing</option>
              <option>Electrical</option><option>Appliance</option><option>Roof</option>
              <option>Pest Control</option><option>Cleaning</option><option>Flooring</option>
              <option>Windows</option><option>Painting</option>
            </select>
          </label>
          <label>Priority
            <select name="priority">
              <option>Low</option>
              <option selected>Medium</option>
              <option>High</option>
            </select>
          </label>
          <label>Related feature (optional)
            <select name="featureId">${featureOptions}</select>
          </label>
          <label>Description <textarea name="description" placeholder="Additional details..."></textarea></label>
          <button class="btn" type="submit">Create request</button>
        </form>

        <div class="mt12">
          ${maint.length > 0 ? tableHtml(["Issue","Category","Feature","Priority","Status","Created","Action"], rows) 
            : `<div class="muted small">No active maintenance requests.</div>`}
        </div>
      </div>

      ${maintHistory.length > 0 ? `
      <div class="panel mt16">
        <div class="panel-h">Maintenance History</div>
        ${tableHtml(["Issue","Category","Feature","Completed","Cost"], historyRows)}
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
            <button class="btn btn-ghost" data-delete-feature="${f.id}">Delete</button>
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

    return `
      <div class="panel">
        <div class="panel-h">Features & Appliances</div>
        <div class="muted small mb12">Track appliances, systems, and features with warranty and service information.</div>

        <form class="form compact" id="addFeatureForUnit">
          <div class="grid2">
            <label>Category
              <select name="category">
                <option>Appliance</option>
                <option>HVAC</option>
                <option>Plumbing</option>
                <option>Electrical</option>
                <option>Flooring</option>
                <option>Roof</option>
                <option>Windows</option>
                <option>Exterior</option>
                <option>Safety</option>
                <option>Other</option>
              </select>
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

  // ----- TOP-LEVEL VIEWS -----
  function viewDashboard() {
    const state = window.Data.db();
    const leases = state.leases.filter(l => l.active !== false);
    const expiringSoon = leases.slice().sort((a,b) => (a.end > b.end ? 1 : -1)).slice(0, 5);

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
          <a href="#notifications" class="link mt12" style="display:block;">View all notifications →</a>
        </div>
      </div>

      <div class="panel mt16">
        <div class="panel-h">Current Month Rent Status (Jan 2026)</div>
        ${tableHtml(["Unit","Tenant","Amount","Status"], state.payments.filter(p => p.month === "2026-01").map(p => {
          const lease = state.leases.find(l => l.id === p.leaseId);
          const unit = state.units.find(u => u.id === lease?.unitId);
          const tenant = state.tenants.find(t => t.id === lease?.tenantId);
          return [
            esc(unitLabel(unit, state)),
            esc(tenant?.name || "—"),
            "$" + fmt(p.amount), 
            pillStatus(p.status)
          ];
        }))}
      </div>

      <div class="panel mt16">
        <div class="panel-h">Leases Expiring Soon</div>
        ${expiringSoon.length > 0 ? tableHtml(["Unit","Tenant","End Date","Rent"], expiringSoon.map(l => {
          const unit = state.units.find(u => u.id === l.unitId);
          const tenant = state.tenants.find(t => t.id === l.tenantId);
          return [
            esc(unitLabel(unit, state)),
            esc(tenant?.name || "—"),
            l.end,
            "$" + fmt(l.rent)
          ];
        })) : `<div class="muted small">No leases expiring in the next 90 days.</div>`}
      </div>
    `;
  }

  function viewProperties() {
    const state = window.Data.db();

    const propertyOptions = state.properties.map(p =>
      `<option value="${p.id}">${esc(p.name)}</option>`
    ).join("");

    const props = state.properties.map(p => {
      const units = state.units.filter(u => u.propertyId === p.id);
      const occupiedCount = units.filter(u => u.status === "Occupied").length;

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
            ${units.length > 0 ? tableHtml(["Unit","Status","Rent","Sq Ft","Tenant","Actions"], units.map(u => [
              esc(u.label),
              pillStatus(u.status),
              "$" + fmt(u.rent),
              fmt(u.sqft),
              esc(u.tenantName || "—"),
              `<button class="btn btn-ghost" data-open-unit="${u.id}">Open</button>
               <button class="btn btn-ghost" data-delete-unit="${u.id}">Delete</button>`
            ])) : `<div class="muted small">No units yet. Add units using the form on the right.</div>`}
          </div>

          <div class="mt12">
            <button class="btn btn-ghost" data-delete-property="${p.id}">Delete Property</button>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="grid2">
        <div class="panel">
          <div class="panel-h">Add New Property</div>
          <form id="addPropertyForm" class="form compact">
            <label>Property name <input name="name" placeholder="e.g., Capitol Hill Apartments" required></label>
            <label>Full address <input name="address" placeholder="123 Main St, City, State ZIP" required></label>
            <label>Property type
              <select name="type">
                <option>Apartment</option>
                <option>House</option>
                <option>Condo</option>
                <option>Townhome</option>
                <option>Duplex</option>
                <option>Triplex</option>
                <option>Multi-family</option>
              </select>
            </label>
            <button class="btn" type="submit">Add property</button>
          </form>
        </div>

        <div class="panel">
          <div class="panel-h">Add Unit to Property</div>
          <form id="addUnitFromProperties" class="form compact">
            <label>Select property
              <select name="propertyId" required>
                <option value="">Choose a property</option>
                ${propertyOptions}
              </select>
            </label>
            <label>Unit label <input name="label" placeholder="e.g., 201 or Unit A" required></label>
            <label>Square feet <input name="sqft" type="number" placeholder="0"></label>
            <label>Monthly rent <input name="rent" type="number" placeholder="0" required></label>
            <button class="btn" type="submit">Add unit</button>
          </form>
          <div class="muted small mt8">Tip: Units cannot be deleted if they have an active lease.</div>
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
    
    // Get filter values
    const filterStatus = document.getElementById("filterStatus")?.value || "all";
    const filterUnit = document.getElementById("filterUnit")?.value || "all";
    
    // Filter maintenance
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

    const rows = filteredMaint.map(m => {
      const unit = state.units.find(u => u.id === m.unitId);
      const feature = state.unit_features.find(f => f.id === m.featureId);
      const next = m.status === "Open" ? "In Progress" : "Complete";
      const priorityBadge = m.priority === "High" ? "pill-warn" : m.priority === "Medium" ? "pill-mid" : "pill-ok";
      
      return [
        esc(unitLabel(unit, state)),
        esc(m.title),
        esc(m.category || "—"),
        feature ? esc(`${feature.category} • ${feature.name}`) : "—",
        `<span class="pill ${priorityBadge}">${esc(m.priority || "Low")}</span>`,
        pillStatus(m.status),
        m.created,
        `<button class="btn btn-ghost" data-maint-advance="${m.id}" data-next="${next}">→ ${next}</button>`
      ];
    });

    // Maintenance history
    const historyRows = (state.maintenance_history || []).slice().sort((a,b) => (a.completed < b.completed ? 1 : -1)).slice(0, 10).map(h => {
      const unit = state.units.find(u => u.id === h.unitId);
      const feature = state.unit_features.find(f => f.id === h.featureId);
      return [
        esc(unitLabel(unit, state)),
        esc(h.title),
        esc(h.category || "—"),
        feature ? esc(`${feature.category} • ${feature.name}`) : "—",
        h.completed,
        "$" + fmt(h.cost)
      ];
    });

    return `
      <div class="grid2">
        <div class="panel">
          <div class="panel-h">Create Maintenance Request</div>
          <form id="addMaintenanceForm" class="form compact">
            <label>Unit
              <select name="unitId" required>
                <option value="">Select unit</option>
                ${unitOptions}
              </select>
            </label>
            <label>Issue description <input name="title" placeholder="e.g., leaking faucet" required></label>
            <label>Category
              <select name="category">
                <option>General</option><option>HVAC</option><option>Plumbing</option>
                <option>Electrical</option><option>Appliance</option><option>Roof</option>
                <option>Pest Control</option><option>Cleaning</option><option>Flooring</option>
                <option>Windows</option><option>Painting</option>
              </select>
            </label>
            <label>Priority
              <select name="priority">
                <option>Low</option>
                <option selected>Medium</option>
                <option>High</option>
              </select>
            </label>
            <label>Description <textarea name="description" placeholder="Additional details..."></textarea></label>
            <button class="btn" type="submit">Create request</button>
          </form>
        </div>

        <div class="panel">
          <div class="panel-h">Maintenance Statistics</div>
          <div class="stack">
            <div>
              <div class="muted small">Open Requests</div>
              <div style="font-size:24px; font-weight:900;">${state.maintenance.filter(m => m.status === "Open").length}</div>
            </div>
            <div>
              <div class="muted small">In Progress</div>
              <div style="font-size:24px; font-weight:900;">${state.maintenance.filter(m => m.status === "In Progress").length}</div>
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
          <div class="filters">
            <select id="filterStatus" class="filter">
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
            </select>
            <select id="filterUnit" class="filter">
              <option value="all">All Units</option>
              ${unitOptions}
            </select>
          </div>
        </div>
        ${rows.length > 0 ? tableHtml(["Unit","Issue","Category","Feature","Priority","Status","Created","Action"], rows)
          : `<div class="muted small">No active maintenance requests matching the filters.</div>`}
      </div>

      ${historyRows.length > 0 ? `
      <div class="panel mt16">
        <div class="panel-h">Recent Maintenance History (Last 10)</div>
        ${tableHtml(["Unit","Issue","Category","Feature","Completed","Cost"], historyRows)}
      </div>
      ` : ""}
    `;
  }

  function viewVendors() {
    const state = window.Data.db();
    const rows = state.vendors.map(v => [
      esc(v.name),
      esc(v.category || "—"),
      esc(v.phone || "—"),
      esc(v.email || "—"),
      `<button class="btn btn-ghost" data-del-vendor="${v.id}">Delete</button>`
    ]);

    return `
      <div class="grid2">
        <div class="panel">
          <div class="panel-h">Add Vendor</div>
          <form id="addVendorForm" class="form compact">
            <label>Vendor name <input name="name" placeholder="ABC Plumbing" required></label>
            <label>Category
              <select name="category">
                <option>General</option>
                <option>HVAC</option>
                <option>Plumbing</option>
                <option>Electrical</option>
                <option>Appliance</option>
                <option>Roof</option>
                <option>Cleaning</option>
                <option>Pest Control</option>
                <option>Landscaping</option>
                <option>Painting</option>
              </select>
            </label>
            <label>Phone <input name="phone" type="tel" placeholder="555-555-5555"></label>
            <label>Email <input name="email" type="email" placeholder="vendor@email.com"></label>
            <button class="btn" type="submit">Add vendor</button>
          </form>
        </div>

        <div class="panel">
          <div class="panel-h">Vendor Directory</div>
          ${state.vendors.length > 0 ? tableHtml(["Name","Category","Phone","Email","Action"], rows)
            : `<div class="muted small">No vendors added yet.</div>`}
        </div>
      </div>
    `;
  }

  function viewReports() {
    const state = window.Data.db();
    
    // Calculate financial metrics
    const totalRevenue = state.leases.filter(l => l.active !== false).reduce((sum, l) => sum + l.rent, 0);
    const janPayments = state.payments.filter(p => p.month === "2026-01");
    const collected = janPayments.filter(p => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
    const outstanding = janPayments.filter(p => p.status !== "Paid").reduce((s, p) => s + p.amount, 0);
    
    const maintenanceCosts = (state.maintenance_history || []).reduce((sum, m) => sum + (m.cost || 0), 0);
    
    // Occupancy by property
    const propertyStats = state.properties.map(p => {
      const units = state.units.filter(u => u.propertyId === p.id);
      const occupied = units.filter(u => u.status === "Occupied").length;
      const occupancy = units.length ? Math.round((occupied / units.length) * 100) : 0;
      const revenue = units.filter(u => u.status === "Occupied").reduce((sum, u) => sum + u.rent, 0);
      
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
        ${tableHtml(["Property","Units","Occupied","Occupancy","Monthly Revenue"], propertyStats)}
      </div>

      <div class="panel mt16">
        <div class="panel-h">Maintenance Summary</div>
        <div class="grid2">
          <div>
            <div class="muted small">Open Requests</div>
            <div style="font-size:24px; font-weight:900;">${state.maintenance.filter(m => m.status === "Open").length}</div>
          </div>
          <div>
            <div class="muted small">In Progress</div>
            <div style="font-size:24px; font-weight:900;">${state.maintenance.filter(m => m.status === "In Progress").length}</div>
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
        💡 Tip: Export features and advanced analytics coming soon to the full version!
      </div>
    `;
  }

  function viewNotifications() {
    const state = window.Data.db();
    const rows = state.notifications
      .slice()
      .sort((a,b) => (a.created < b.created ? 1 : -1))
      .map(n => [
        n.created, 
        `<span class="pill pill-mid">${esc(n.type)}</span>`,
        esc(n.text)
      ]);

    return `
      <div class="panel">
        <div class="row between mb12">
          <div class="panel-h">Notifications & Alerts</div>
          <button id="clearNotifications" class="btn btn-ghost">Clear All</button>
        </div>
        ${rows.length > 0 ? tableHtml(["Date","Type","Message"], rows)
          : `<div class="muted small">No notifications.</div>`}
      </div>
    `;
  }

  // User menu pages
  function viewProfile() {
    const profile = window.Data.getProfile(email) || {};
    return `
      <div class="panel">
        <div class="panel-h">My Profile</div>
        <form id="profileForm" class="form compact mt12">
          <label>Full Name <input name="name" value="${esc(me.name || "")}" required></label>
          <label>Phone <input name="phone" type="tel" placeholder="555-123-4567" value="${esc(profile.phone || "")}" required></label>
          <label>Company (optional) <input name="company" placeholder="Your Property Management Company" value="${esc(profile.company || "")}"></label>
          <label>Portfolio name (optional) <input name="portfolioName" placeholder="e.g., DC Metro Portfolio" value="${esc(profile.portfolioName || "")}"></label>
          <button class="btn" type="submit">Save Profile</button>
        </form>
      </div>
    `;
  }

  function viewSettings() {
    return `
      <div class="panel">
        <div class="panel-h">My Settings</div>
        <div class="stack">
          <div>
            <div class="muted small mb8">Sidebar Behavior</div>
            <button class="btn btn-ghost" onclick="localStorage.removeItem('sidebar_collapsed'); location.reload();">
              Reset Sidebar State
            </button>
          </div>
          <div>
            <div class="muted small mb8">Data Management</div>
            <div class="warning-box">
              ⚠️ Warning: This will delete ALL your data. This action cannot be undone.
            </div>
            <button class="btn btn-ghost mt8" onclick="if(confirm('Delete ALL data? This cannot be undone!')) { localStorage.clear(); location.href='./index.html'; }">
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function viewAccount() {
    const profile = window.Data.getProfile(email) || {};
    return `
      <div class="grid2">
        <div class="panel">
          <div class="panel-h">Account Information</div>
          <div class="stack">
            <div>
              <div class="muted small">Name</div>
              <div><b>${esc(me.name || "—")}</b></div>
            </div>
            <div>
              <div class="muted small">Email</div>
              <div><b>${esc(me.email)}</b></div>
            </div>
            <div>
              <div class="muted small">Role</div>
              <div><b>${roleLabel(role)}</b></div>
            </div>
            <div>
              <div class="muted small">Company</div>
              <div><b>${esc(profile.company || "Not set")}</b></div>
            </div>
            <div>
              <div class="muted small">Phone</div>
              <div><b>${esc(profile.phone || "Not set")}</b></div>
            </div>
            <div>
              <div class="muted small">Portfolio</div>
              <div><b>${esc(profile.portfolioName || "Not set")}</b></div>
            </div>
          </div>
          <a href="#profile" class="btn btn-ghost mt12" style="display:inline-block;">Edit Profile</a>
        </div>

        <div class="panel">
          <div class="panel-h">System Information</div>
          <div class="muted small mb12">This is a prototype application. All data is stored locally in your browser.</div>
          <div class="stack">
            <div>
              <div class="muted small">Data Storage</div>
              <div><b>Browser localStorage</b></div>
            </div>
            <div>
              <div class="muted small">Version</div>
              <div><b>HomeManager v2.0 (Enhanced)</b></div>
            </div>
            <div>
              <div class="muted small">Last Updated</div>
              <div><b>February 2026</b></div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel mt16">
        <div class="panel-h">Coming Soon</div>
        <div class="muted small">Future integrations and features:</div>
        <div class="stack mt12">
          <div>• Stripe/Plaid integration for automated rent collection</div>
          <div>• QuickBooks sync for accounting</div>
          <div>• Email/SMS notifications for tenants</div>
          <div>• Document storage and e-signatures</div>
          <div>• Mobile app for iOS and Android</div>
          <div>• Tenant portal for payment and maintenance requests</div>
        </div>
      </div>
    `;
  }

  // Update routes to include user menu pages
  const originalGetRoutesForRole = getRoutesForRole;
  getRoutesForRole = function(role) {
    const baseRoutes = originalGetRoutesForRole(role);
    return [
      ...baseRoutes,
      { key: "profile", title: "My Profile", subtitle: "Manage your profile", render: viewProfile },
      { key: "settings", title: "My Settings", subtitle: "Application settings", render: viewSettings },
      { key: "account", title: "My Account", subtitle: "Account information", render: viewAccount }
    ];
  };

  // Wire profile form
  if (parseHash().key === "profile") {
    setTimeout(() => {
      const form = document.getElementById("profileForm");
      form?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = form.name.value.trim();
        const phone = form.phone.value.trim();
        const company = form.company.value.trim();
        const portfolioName = form.portfolioName.value.trim();

        if (!phone) return alert("Phone is required.");

        window.Data.setProfile(email, {
          completed: true,
          phone,
          company,
          portfolioName,
          role: role
        });

        alert("Profile updated successfully!");
        window.location.hash = "#dashboard";
      });
    }, 100);
  }

  // ----- HELPER FUNCTIONS -----
  function roleLabel(r) {
    if (r === "property_manager") return "Property Manager";
    if (r === "landlord") return "Landlord / Owner";
    return "Tenant";
  }

  function unitLabel(unit, state) {
    if (!unit) return "—";
    const prop = state.properties.find(p => p.id === unit.propertyId);
    return `${prop?.name || "Property"} • ${unit.label}`;
  }

  function pillStatus(s) {
    const cls = s === "Paid" || s === "Occupied" || s === "Complete"
      ? "pill pill-ok"
      : (s === "Unpaid" || s === "Vacant" ? "pill pill-warn" : "pill pill-mid");
    return `<span class="${cls}">${esc(String(s))}</span>`;
  }

  function tableHtml(headers, rows) {
    if (!rows || rows.length === 0) {
      return `<div class="muted small">No data available.</div>`;
    }
    
    return `
      <div class="tablewrap">
        <table>
          <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString("en-US");
  }

  function today() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
})();
