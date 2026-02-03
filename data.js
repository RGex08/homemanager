(function () {
  const KEY = "hm_data_v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; }
    catch { return null; }
  }
  function save(db) {
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  function bootstrap() {
    if (load()) return;

    const db = {
      // Profile completion tracked per user email
      profiles: {
        // "demo@homemanager.com": { completed: true, phone: "...", company: "...", portfolioName: "...", role: "property_manager" }
      },

      // TOP LEVEL
      properties: [
        { id: "p1", name: "Capitol Hill Duplex", address: "123 A St NE, Washington, DC", type: "House" },
        { id: "p2", name: "Navy Yard Flats", address: "77 Water St SE, Washington, DC", type: "Apartment" }
      ],

      // CHILD OF PROPERTIES
      units: [
        { id: "u1", propertyId: "p1", label: "Unit A", sqft: 900, rent: 2800, status: "Occupied", tenantName: "Jordan Lee", leaseActive: true },
        { id: "u2", propertyId: "p1", label: "Unit B", sqft: 850, rent: 2600, status: "Vacant", tenantName: "", leaseActive: false },
        { id: "u3", propertyId: "p2", label: "101", sqft: 720, rent: 2500, status: "Occupied", tenantName: "Sam Patel", leaseActive: true },
        { id: "u4", propertyId: "p2", label: "102", sqft: 705, rent: 2450, status: "Occupied", tenantName: "Avery Chen", leaseActive: true },
        { id: "u5", propertyId: "p2", label: "103", sqft: 690, rent: 2400, status: "Vacant", tenantName: "", leaseActive: false }
      ],

      // CHILD OF UNITS (SIBLING OF LEASES)
      tenants: [
        { id: "t1", name: "Jordan Lee", email: "jordan@example.com", phone: "555-111-2222", unitId: "u1" },
        { id: "t2", name: "Sam Patel", email: "sam@example.com", phone: "555-222-3333", unitId: "u3" },
        { id: "t3", name: "Avery Chen", email: "avery@example.com", phone: "555-333-4444", unitId: "u4" }
      ],

      // CHILD OF UNITS (SIBLING OF TENANTS)
      leases: [
        { id: "l1", unitId: "u1", tenantId: "t1", start: "2025-06-01", end: "2026-05-31", rent: 2800, deposit: 2800 },
        { id: "l2", unitId: "u3", tenantId: "t2", start: "2025-09-01", end: "2026-08-31", rent: 2500, deposit: 2500 },
        { id: "l3", unitId: "u4", tenantId: "t3", start: "2025-03-01", end: "2026-02-28", rent: 2450, deposit: 2450 }
      ],

      // CHILD OF LEASES (PAYMENTS BELONG TO A LEASE)
      payments: [
        { id: "pay1", leaseId: "l1", month: "2026-01", amount: 2800, status: "Paid" },
        { id: "pay2", leaseId: "l2", month: "2026-01", amount: 2500, status: "Paid" },
        { id: "pay3", leaseId: "l3", month: "2026-01", amount: 2450, status: "Unpaid" }
      ],

      // CHILD OF UNITS: FEATURES (systems/appliances) — used by Maintenance
      unit_features: [
        { id: "f1", unitId: "u1", name: "Dishwasher (Bosch)", category: "Appliance" },
        { id: "f2", unitId: "u1", name: "HVAC (Carrier)", category: "HVAC" },
        { id: "f3", unitId: "u3", name: "Washer/Dryer", category: "Appliance" }
      ],

      // CHILD OF UNITS: MAINTENANCE (can link to a feature)
      maintenance: [
        { id: "m1", unitId: "u1", title: "Dishwasher not draining", category: "Appliance", status: "Open", created: "2026-01-22", vendorId: "", featureId: "f1" },
        { id: "m2", unitId: "u3", title: "HVAC making noise", category: "HVAC", status: "In Progress", created: "2026-01-18", vendorId: "v1", featureId: "f2" }
      ],

      // CHILD OF UNITS: MAINTENANCE HISTORY (completed maintenance; can link to a feature)
      maintenance_history: [
        { id: "mh1", unitId: "u3", title: "HVAC filter replacement", category: "HVAC", status: "Complete", cost: 180, vendorId: "v1", featureId: "f2", completed: "2025-12-10" },
        { id: "mh2", unitId: "u1", title: "Garbage disposal unclog", category: "Plumbing", status: "Complete", cost: 120, vendorId: "v2", featureId: "", completed: "2025-11-03" }
      ],

      // REUSABLE ENTITIES (used by maintenance + preventive tasks)
      vendors: [
        { id: "v1", name: "District HVAC Co.", phone: "555-777-1212", email: "dispatch@dhvac.com", category: "HVAC" },
        { id: "v2", name: "Capitol Plumbing", phone: "555-888-3434", email: "service@capplumb.com", category: "Plumbing" }
      ],

      // Preventive maintenance can be Property-scoped or Unit-scoped
      preventive_tasks: [
        { id: "pm1", scope: "Property", propertyId: "p2", unitId: "", title: "Smoke/CO detector test", frequency: "Quarterly", nextDue: "2026-03-15", vendorId: "" },
        { id: "pm2", scope: "Unit", propertyId: "p1", unitId: "u1", title: "HVAC seasonal tune-up", frequency: "Semi-Annual", nextDue: "2026-04-01", vendorId: "v1" }
      ],

      notifications: [
        { id: "n1", type: "Lease", text: "Lease ending soon: Unit 102 (ends 2026-02-28)", created: "2026-01-20" },
        { id: "n2", type: "Rent", text: "Rent overdue: Unit 102 (Jan payment unpaid)", created: "2026-01-26" },
        { id: "n3", type: "Maintenance", text: "New request: Dishwasher not draining (Unit A)", created: "2026-01-22" }
      ]
    };

    save(db);
  }

  function db() {
    return load() || {
      profiles: {},
      properties: [],
      units: [],
      tenants: [],
      leases: [],
      payments: [],
      unit_features: [],
      maintenance: [],
      maintenance_history: [],
      vendors: [],
      preventive_tasks: [],
      notifications: []
    };
  }

  function write(mutator) {
    const state = db();
    mutator(state);
    save(state);
  }

  function add(collectionName, item) {
    write(state => {
      state[collectionName] = state[collectionName] || [];
      state[collectionName].push(item);
    });
  }

  function upsert(collectionName, item) {
    write(state => {
      state[collectionName] = state[collectionName] || [];
      const idx = state[collectionName].findIndex(x => x.id === item.id);
      if (idx >= 0) state[collectionName][idx] = item;
      else state[collectionName].push(item);
    });
  }

  function remove(collectionName, id) {
    write(state => {
      state[collectionName] = (state[collectionName] || []).filter(x => x.id !== id);
    });
  }

  function setProfile(email, profile) {
    write(state => {
      state.profiles = state.profiles || {};
      state.profiles[email] = profile;
    });
  }

  function getProfile(email) {
    const state = db();
    return (state.profiles || {})[email] || null;
  }

  window.Data = { bootstrap, db, add, upsert, remove, setProfile, getProfile };
})();
