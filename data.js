/**
 * HomeManager Data Module
 * Handles data persistence with localStorage and CRUD operations
 */
(function () {
  "use strict";

  const { STORAGE_KEYS, UNIT_STATUS, MAINTENANCE_STATUS, PAYMENT_STATUS, CATEGORIES, NOTIFICATION_TYPES } = window.Constants;

  /**
   * Load database from localStorage
   * @returns {Object|null} Database object or null
   */
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DATA)) || null;
    } catch {
      return null;
    }
  }

  /**
   * Save database to localStorage
   * @param {Object} database - Database object to save
   */
  function save(database) {
    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(database));
  }

  /**
   * Initialize database with sample data if empty
   */
  function bootstrap() {
    if (load()) return;

    const database = {
      // Profile completion tracked per user email
      profiles: {},

      // Properties
      properties: [
        {
          id: "p1",
          name: "Capitol Hill Duplex",
          address: "123 A St NE, Washington, DC",
          type: "House"
        },
        {
          id: "p2",
          name: "Navy Yard Flats",
          address: "77 Water St SE, Washington, DC",
          type: "Apartment"
        }
      ],

      // Units (child of properties)
      units: [
        {
          id: "u1",
          propertyId: "p1",
          label: "Unit A",
          sqft: 900,
          rent: 2800,
          status: UNIT_STATUS.OCCUPIED,
          tenantName: "Jordan Lee",
          leaseActive: true
        },
        {
          id: "u2",
          propertyId: "p1",
          label: "Unit B",
          sqft: 850,
          rent: 2600,
          status: UNIT_STATUS.VACANT,
          tenantName: "",
          leaseActive: false
        },
        {
          id: "u3",
          propertyId: "p2",
          label: "101",
          sqft: 720,
          rent: 2500,
          status: UNIT_STATUS.OCCUPIED,
          tenantName: "Sam Patel",
          leaseActive: true
        },
        {
          id: "u4",
          propertyId: "p2",
          label: "102",
          sqft: 705,
          rent: 2450,
          status: UNIT_STATUS.OCCUPIED,
          tenantName: "Avery Chen",
          leaseActive: true
        },
        {
          id: "u5",
          propertyId: "p2",
          label: "103",
          sqft: 690,
          rent: 2400,
          status: UNIT_STATUS.VACANT,
          tenantName: "",
          leaseActive: false
        }
      ],

      // Tenants (child of units)
      tenants: [
        { id: "t1", name: "Jordan Lee", email: "jordan@example.com", phone: "555-111-2222", unitId: "u1" },
        { id: "t2", name: "Sam Patel", email: "sam@example.com", phone: "555-222-3333", unitId: "u3" },
        { id: "t3", name: "Avery Chen", email: "avery@example.com", phone: "555-333-4444", unitId: "u4" }
      ],

      // Leases (child of units)
      leases: [
        { id: "l1", unitId: "u1", tenantId: "t1", start: "2025-06-01", end: "2026-05-31", rent: 2800, deposit: 2800 },
        { id: "l2", unitId: "u3", tenantId: "t2", start: "2025-09-01", end: "2026-08-31", rent: 2500, deposit: 2500 },
        { id: "l3", unitId: "u4", tenantId: "t3", start: "2025-03-01", end: "2026-02-28", rent: 2450, deposit: 2450 }
      ],

      // Payments (child of leases)
      payments: [
        { id: "pay1", leaseId: "l1", month: "2026-01", amount: 2800, status: PAYMENT_STATUS.PAID },
        { id: "pay2", leaseId: "l2", month: "2026-01", amount: 2500, status: PAYMENT_STATUS.PAID },
        { id: "pay3", leaseId: "l3", month: "2026-01", amount: 2450, status: PAYMENT_STATUS.UNPAID }
      ],

      // Unit features (appliances/systems)
      unit_features: [
        { id: "f1", unitId: "u1", name: "Dishwasher (Bosch)", category: CATEGORIES.APPLIANCE },
        { id: "f2", unitId: "u1", name: "HVAC (Carrier)", category: CATEGORIES.HVAC },
        { id: "f3", unitId: "u3", name: "Washer/Dryer", category: CATEGORIES.APPLIANCE }
      ],

      // Active maintenance requests
      maintenance: [
        {
          id: "m1",
          unitId: "u1",
          title: "Dishwasher not draining",
          category: CATEGORIES.APPLIANCE,
          status: MAINTENANCE_STATUS.OPEN,
          created: "2026-01-22",
          vendorId: "",
          featureId: "f1"
        },
        {
          id: "m2",
          unitId: "u3",
          title: "HVAC making noise",
          category: CATEGORIES.HVAC,
          status: MAINTENANCE_STATUS.IN_PROGRESS,
          created: "2026-01-18",
          vendorId: "v1",
          featureId: "f2"
        }
      ],

      // Completed maintenance history
      maintenance_history: [
        {
          id: "mh1",
          unitId: "u3",
          title: "HVAC filter replacement",
          category: CATEGORIES.HVAC,
          status: MAINTENANCE_STATUS.COMPLETE,
          cost: 180,
          vendorId: "v1",
          featureId: "f2",
          completed: "2025-12-10"
        },
        {
          id: "mh2",
          unitId: "u1",
          title: "Garbage disposal unclog",
          category: CATEGORIES.PLUMBING,
          status: MAINTENANCE_STATUS.COMPLETE,
          cost: 120,
          vendorId: "v2",
          featureId: "",
          completed: "2025-11-03"
        }
      ],

      // Vendors
      vendors: [
        {
          id: "v1",
          name: "District HVAC Co.",
          phone: "555-777-1212",
          email: "dispatch@dhvac.com",
          category: CATEGORIES.HVAC
        },
        {
          id: "v2",
          name: "Capitol Plumbing",
          phone: "555-888-3434",
          email: "service@capplumb.com",
          category: CATEGORIES.PLUMBING
        }
      ],

      // Preventive maintenance tasks
      preventive_tasks: [
        {
          id: "pm1",
          scope: "Property",
          propertyId: "p2",
          unitId: "",
          title: "Smoke/CO detector test",
          frequency: "Quarterly",
          nextDue: "2026-03-15",
          vendorId: ""
        },
        {
          id: "pm2",
          scope: "Unit",
          propertyId: "p1",
          unitId: "u1",
          title: "HVAC seasonal tune-up",
          frequency: "Semi-Annual",
          nextDue: "2026-04-01",
          vendorId: "v1"
        }
      ],

      // Notifications
      notifications: [
        {
          id: "n1",
          type: NOTIFICATION_TYPES.LEASE,
          text: "Lease ending soon: Unit 102 (ends 2026-02-28)",
          created: "2026-01-20"
        },
        {
          id: "n2",
          type: NOTIFICATION_TYPES.RENT,
          text: "Rent overdue: Unit 102 (Jan payment unpaid)",
          created: "2026-01-26"
        },
        {
          id: "n3",
          type: NOTIFICATION_TYPES.MAINTENANCE,
          text: "New request: Dishwasher not draining (Unit A)",
          created: "2026-01-22"
        }
      ]
    };

    save(database);
  }

  /**
   * Get current database state
   * @returns {Object} Database object with all collections
   */
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

  /**
   * Write to database with a mutator function
   * @param {Function} mutator - Function that receives and modifies state
   */
  function write(mutator) {
    const state = db();
    mutator(state);
    save(state);
  }

  /**
   * Add an item to a collection
   * @param {string} collectionName - Name of the collection
   * @param {Object} item - Item to add
   */
  function add(collectionName, item) {
    write(state => {
      state[collectionName] = state[collectionName] || [];
      state[collectionName].push(item);
    });
  }

  /**
   * Update or insert an item in a collection
   * @param {string} collectionName - Name of the collection
   * @param {Object} item - Item to upsert (must have id property)
   */
  function upsert(collectionName, item) {
    write(state => {
      state[collectionName] = state[collectionName] || [];
      const idx = state[collectionName].findIndex(x => x.id === item.id);
      if (idx >= 0) {
        state[collectionName][idx] = item;
      } else {
        state[collectionName].push(item);
      }
    });
  }

  /**
   * Remove an item from a collection by ID
   * @param {string} collectionName - Name of the collection
   * @param {string} id - ID of item to remove
   */
  function remove(collectionName, id) {
    write(state => {
      state[collectionName] = (state[collectionName] || []).filter(x => x.id !== id);
    });
  }

  /**
   * Set user profile data
   * @param {string} email - User email
   * @param {Object} profile - Profile data
   */
  function setProfile(email, profile) {
    write(state => {
      state.profiles = state.profiles || {};
      state.profiles[email] = profile;
    });
  }

  /**
   * Get user profile data
   * @param {string} email - User email
   * @returns {Object|null} Profile data or null
   */
  function getProfile(email) {
    const state = db();
    return (state.profiles || {})[email] || null;
  }

  // Export Data API
  window.Data = Object.freeze({
    bootstrap,
    db,
    write,
    add,
    upsert,
    remove,
    setProfile,
    getProfile
  });
})();
