/**
 * HomeManager Constants
 * Centralized configuration for magic strings and values
 */
(function () {
  "use strict";

  // Storage keys for localStorage
  const STORAGE_KEYS = Object.freeze({
    AUTH: "hm_auth_v1",
    USERS: "hm_users_v1",
    DATA: "hm_data_v1",
    SIDEBAR_COLLAPSED: "sidebar_collapsed"
  });

  // User roles
  const ROLES = Object.freeze({
    PROPERTY_MANAGER: "property_manager",
    LANDLORD: "landlord",
    TENANT: "tenant"
  });

  // Role display labels
  const ROLE_LABELS = Object.freeze({
    [ROLES.PROPERTY_MANAGER]: "Property Manager",
    [ROLES.LANDLORD]: "Landlord / Owner",
    [ROLES.TENANT]: "Tenant"
  });

  // Unit statuses
  const UNIT_STATUS = Object.freeze({
    OCCUPIED: "Occupied",
    VACANT: "Vacant"
  });

  // Maintenance statuses
  const MAINTENANCE_STATUS = Object.freeze({
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    COMPLETE: "Complete"
  });

  // Payment statuses
  const PAYMENT_STATUS = Object.freeze({
    PAID: "Paid",
    UNPAID: "Unpaid"
  });

  // Maintenance priorities
  const PRIORITY = Object.freeze({
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High"
  });

  // Maintenance and feature categories
  const CATEGORIES = Object.freeze({
    GENERAL: "General",
    HVAC: "HVAC",
    PLUMBING: "Plumbing",
    ELECTRICAL: "Electrical",
    APPLIANCE: "Appliance",
    ROOF: "Roof",
    PEST_CONTROL: "Pest Control",
    CLEANING: "Cleaning",
    FLOORING: "Flooring",
    WINDOWS: "Windows",
    PAINTING: "Painting",
    EXTERIOR: "Exterior",
    SAFETY: "Safety",
    LANDSCAPING: "Landscaping",
    OTHER: "Other"
  });

  // Property types
  const PROPERTY_TYPES = Object.freeze({
    APARTMENT: "Apartment",
    HOUSE: "House",
    CONDO: "Condo",
    TOWNHOME: "Townhome",
    DUPLEX: "Duplex",
    TRIPLEX: "Triplex",
    MULTI_FAMILY: "Multi-family"
  });

  // Notification types
  const NOTIFICATION_TYPES = Object.freeze({
    LEASE: "Lease",
    RENT: "Rent",
    MAINTENANCE: "Maintenance"
  });

  // Preventive task frequencies
  const FREQUENCY = Object.freeze({
    QUARTERLY: "Quarterly",
    SEMI_ANNUAL: "Semi-Annual",
    ANNUAL: "Annual"
  });

  // Preventive task scopes
  const TASK_SCOPE = Object.freeze({
    PROPERTY: "Property",
    UNIT: "Unit"
  });

  // ID prefixes for different entity types
  const ID_PREFIX = Object.freeze({
    USER: "u_",
    PROPERTY: "p",
    UNIT: "u",
    TENANT: "t",
    LEASE: "l",
    PAYMENT: "pay",
    FEATURE: "f",
    MAINTENANCE: "m",
    MAINTENANCE_HISTORY: "mh",
    VENDOR: "v",
    NOTIFICATION: "n",
    PREVENTIVE_TASK: "pm"
  });

  // Data collection names
  const COLLECTIONS = Object.freeze({
    PROFILES: "profiles",
    PROPERTIES: "properties",
    UNITS: "units",
    TENANTS: "tenants",
    LEASES: "leases",
    PAYMENTS: "payments",
    UNIT_FEATURES: "unit_features",
    MAINTENANCE: "maintenance",
    MAINTENANCE_HISTORY: "maintenance_history",
    VENDORS: "vendors",
    PREVENTIVE_TASKS: "preventive_tasks",
    NOTIFICATIONS: "notifications"
  });

  // Export all constants
  window.Constants = Object.freeze({
    STORAGE_KEYS,
    ROLES,
    ROLE_LABELS,
    UNIT_STATUS,
    MAINTENANCE_STATUS,
    PAYMENT_STATUS,
    PRIORITY,
    CATEGORIES,
    PROPERTY_TYPES,
    NOTIFICATION_TYPES,
    FREQUENCY,
    TASK_SCOPE,
    ID_PREFIX,
    COLLECTIONS
  });
})();
