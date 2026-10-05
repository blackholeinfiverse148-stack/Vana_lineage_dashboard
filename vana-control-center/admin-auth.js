/**
 * VANA Control Center — Admin Authentication & Authorization Boundary
 * ====================================================================
 *
 * This is the SINGLE module responsible for user identity and permission
 * resolution in the Admin Control Plane.
 *
 * ── DEV MODE (currently active) ───────────────────────────────────────
 * A role simulator is active. Simulated role is stored in sessionStorage
 * only (cleared when tab closes). No credentials are stored or checked.
 * No users are fabricated. The role picker is visible in the Admin UI
 * under a clearly-labelled [DEV] banner.
 *
 * ── PRODUCTION INTEGRATION ────────────────────────────────────────────
 * To connect a real authentication provider:
 *   1. Set DEV_MODE = false  (line ~50 below)
 *   2. Implement _productionGetCurrentUser() to call your auth backend:
 *      - OAuth2 token introspection endpoint
 *      - OIDC /userinfo endpoint
 *      - Government SSO / SAML assertion consumer
 *      - Custom backend: GET /api/auth/me → { id, name, role, permissions }
 *   3. No other files in the Admin UI need to change.
 *
 * ── SECURITY NOTICE ───────────────────────────────────────────────────
 * Frontend permission checks are UX gates only. They control what the
 * Admin UI renders, not what actions are possible.
 *
 * Backend API endpoints (when they exist) MUST enforce authorization
 * independently via session tokens / JWT / RBAC middleware.
 * Do NOT rely on frontend checks alone for any sensitive operation.
 * =====================================================================
 */
(function () {
  "use strict";

  // ── DEPLOYMENT SWITCH ──────────────────────────────────────────────
  // Set to false and implement _productionGetCurrentUser() for production.
  const DEV_MODE = true;
  // ──────────────────────────────────────────────────────────────────

  // ── ROLE DEFINITIONS (FOREST DEPT HIERARCHY + LEGACY ALIASES) ──────
  const ROLES = Object.freeze({
    // Strategic Admin Ranks (State / Multi-Circle / Circle)
    PCCF_HOFF:     "pccf_hoff",
    APCCF:         "apccf",
    CCF:           "ccf",

    // Tactical Officer Ranks (Circle / Division / Sub-Division / Range)
    CF:            "cf",
    DCF_DFO:       "dcf_dfo",
    ACF:           "acf",
    RFO:           "rfo",

    // Field Agent Ranks (Section / Beat)
    FORESTER:      "forester",
    FOREST_GUARD:  "forest_guard",

    // Backward-Compatible Legacy SaaS Aliases
    VIEWER:        "viewer",
    OPERATOR:      "operator",
    ANALYST:       "analyst",
    ADMINISTRATOR: "administrator",
  });

  // ── TEMPLATES ──────────────────────────────────────────────────────
  const TEMPLATES = Object.freeze({
    ADMIN:   "ADMIN",   // State & Circle overview, governance, replay, system health
    OFFICER: "OFFICER", // Division & Range situation deck, approvals desk, alerts
    FIELD:   "FIELD",   // Section & Beat mobile task list, GPS capture, offline queue
  });

  // ── ROLE → TEMPLATE MAPPING ────────────────────────────────────────
  const ROLE_TEMPLATES = Object.freeze({
    [ROLES.PCCF_HOFF]:     TEMPLATES.ADMIN,
    [ROLES.APCCF]:         TEMPLATES.ADMIN,
    [ROLES.CCF]:           TEMPLATES.ADMIN,
    [ROLES.ADMINISTRATOR]: TEMPLATES.ADMIN,
    [ROLES.ANALYST]:       TEMPLATES.ADMIN,

    [ROLES.CF]:            TEMPLATES.OFFICER,
    [ROLES.DCF_DFO]:       TEMPLATES.OFFICER,
    [ROLES.ACF]:           TEMPLATES.OFFICER,
    [ROLES.RFO]:           TEMPLATES.OFFICER,
    [ROLES.OPERATOR]:      TEMPLATES.OFFICER,

    [ROLES.FORESTER]:      TEMPLATES.FIELD,
    [ROLES.FOREST_GUARD]:  TEMPLATES.FIELD,
    [ROLES.VIEWER]:        TEMPLATES.ADMIN,
  });

  // ── ROLE METADATA & INSTITUTIONAL TITLES ───────────────────────────
  const ROLE_META = Object.freeze({
    pccf_hoff:     { label: "PCCF & HoFF",           rankTitle: "Principal Chief Conservator of Forests & Head of Forest Force", level: "STATE",       template: TEMPLATES.ADMIN,   color: "#8B5CF6" },
    apccf:         { label: "Addl. PCCF",            rankTitle: "Additional Principal Chief Conservator of Forests",             level: "STATE",       template: TEMPLATES.ADMIN,   color: "#7C3AED" },
    ccf:           { label: "CCF (Circle)",          rankTitle: "Chief Conservator of Forests",                                  level: "CIRCLE",      template: TEMPLATES.ADMIN,   color: "#6366F1" },
    cf:            { label: "CF (Conservator)",      rankTitle: "Conservator of Forests",                                        level: "CIRCLE",      template: TEMPLATES.OFFICER, color: "#3B82F6" },
    dcf_dfo:       { label: "DCF / DFO (Division)",  rankTitle: "Deputy Conservator of Forests / Divisional Forest Officer",     level: "DIVISION",    template: TEMPLATES.OFFICER, color: "#0EA5E9" },
    acf:           { label: "ACF (Sub-Division)",    rankTitle: "Assistant Conservator of Forests",                              level: "SUBDIVISION", template: TEMPLATES.OFFICER, color: "#06B6D4" },
    rfo:           { label: "RFO (Range)",           rankTitle: "Range Forest Officer",                                          level: "RANGE",       template: TEMPLATES.OFFICER, color: "#14B8A6" },
    forester:      { label: "Forester (Section)",    rankTitle: "Round Officer / Forester",                                      level: "SECTION",     template: TEMPLATES.FIELD,   color: "#10B981" },
    forest_guard:  { label: "Forest Guard (Beat)",   rankTitle: "Forest Guard / Vanrakshak",                                     level: "BEAT",        template: TEMPLATES.FIELD,   color: "#3A8F5C" },

    // Legacy Aliases
    viewer:        { label: "Viewer",                rankTitle: "Read-only Operational Viewer",                                  level: "STATE",       template: TEMPLATES.ADMIN,   color: "#6B7486" },
    operator:      { label: "Operator",              rankTitle: "Operational Actions Operator",                                  level: "DIVISION",    template: TEMPLATES.OFFICER, color: "#3A8F5C" },
    analyst:       { label: "Analyst",               rankTitle: "Governance & Audit Analyst",                                    level: "CIRCLE",      template: TEMPLATES.ADMIN,   color: "#C9822B" },
    administrator: { label: "Administrator",         rankTitle: "System & Governance Administrator",                             level: "STATE",       template: TEMPLATES.ADMIN,   color: "#8B5CF6" },
  });

  // ── CORE CAPABILITY VERBS ──────────────────────────────────────────
  const CAPABILITIES = Object.freeze({
    VIEW:        "VIEW",
    REVIEW:      "REVIEW",
    SUBMIT:      "SUBMIT",
    ACKNOWLEDGE: "ACKNOWLEDGE",
    APPROVE:     "APPROVE",
    ADMINISTER:  "ADMINISTER",
  });

  // ── PERMISSION CONSTANTS ───────────────────────────────────────────
  const PERMISSIONS = Object.freeze({
    // View
    VIEW_DASHBOARD:            "VIEW_DASHBOARD",
    VIEW_MAP:                  "VIEW_MAP",
    VIEW_ALERTS:               "VIEW_ALERTS",
    VIEW_LINEAGE:              "VIEW_LINEAGE",
    VIEW_EVIDENCE:             "VIEW_EVIDENCE",
    VIEW_AUDIT_LOG:            "VIEW_AUDIT_LOG",
    
    // Field Capture & Submission
    SUBMIT_FIELD_OBSERVATION:  "SUBMIT_FIELD_OBSERVATION",
    SUBMIT_EVIDENCE_ATTACHMENT:"SUBMIT_EVIDENCE_ATTACHMENT",

    // Officer Operations & Review
    ACKNOWLEDGE_ALERT:         "ACKNOWLEDGE_ALERT",
    REVIEW_FIELD_REPORT:       "REVIEW_FIELD_REPORT",
    APPROVE_FIELD_ACTION:      "APPROVE_FIELD_ACTION",
    
    // Governance & Lineage Audit
    RUN_REPLAY:                "RUN_REPLAY",
    
    // Administration Control Plane
    MANAGE_USERS:              "MANAGE_USERS",
    MANAGE_ROLES:              "MANAGE_ROLES",
    MANAGE_MAP_CONFIG:         "MANAGE_MAP_CONFIG",
    MANAGE_ALERT_RULES:        "MANAGE_ALERT_RULES",
    MANAGE_GOVERNANCE_POLICIES:"MANAGE_GOVERNANCE_POLICIES",
    MANAGE_SYSTEM_CONFIG:      "MANAGE_SYSTEM_CONFIG",
  });

  // ── ROLE → PERMISSION MATRIX ───────────────────────────────────────
  const _fieldGuardPerms = [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_MAP,
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.SUBMIT_FIELD_OBSERVATION,
    PERMISSIONS.SUBMIT_EVIDENCE_ATTACHMENT,
  ];

  const _foresterPerms = [
    ..._fieldGuardPerms,
    PERMISSIONS.ACKNOWLEDGE_ALERT,
    PERMISSIONS.REVIEW_FIELD_REPORT,
  ];

  const _rfoPerms = [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_MAP,
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.VIEW_EVIDENCE,
    PERMISSIONS.ACKNOWLEDGE_ALERT,
    PERMISSIONS.REVIEW_FIELD_REPORT,
    PERMISSIONS.APPROVE_FIELD_ACTION,
    PERMISSIONS.SUBMIT_FIELD_OBSERVATION,
  ];

  const _dcfPerms = [
    ..._rfoPerms,
    PERMISSIONS.VIEW_LINEAGE,
  ];

  const _ccfPerms = [
    ..._dcfPerms,
    PERMISSIONS.VIEW_AUDIT_LOG,
    PERMISSIONS.RUN_REPLAY,
  ];

  const _pccfPerms = [
    ..._ccfPerms,
  ];

  const _adminPerms = [
    ..._pccfPerms,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.MANAGE_MAP_CONFIG,
    PERMISSIONS.MANAGE_ALERT_RULES,
    PERMISSIONS.MANAGE_GOVERNANCE_POLICIES,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  ];

  // Legacy mappings
  const _viewerPerms = [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_MAP,
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.VIEW_LINEAGE,
  ];

  const _operatorPerms = [
    ..._viewerPerms,
    PERMISSIONS.VIEW_EVIDENCE,
    PERMISSIONS.RUN_REPLAY,
    PERMISSIONS.ACKNOWLEDGE_ALERT,
  ];

  const _analystPerms = [
    ..._operatorPerms,
    PERMISSIONS.VIEW_AUDIT_LOG,
  ];

  const ROLE_PERMISSIONS = Object.freeze({
    // Forest Department Ranks
    [ROLES.PCCF_HOFF]:     _pccfPerms,
    [ROLES.APCCF]:         _pccfPerms,
    [ROLES.CCF]:           _ccfPerms,
    [ROLES.CF]:            _ccfPerms,
    [ROLES.DCF_DFO]:       _dcfPerms,
    [ROLES.ACF]:           _rfoPerms,
    [ROLES.RFO]:           _rfoPerms,
    [ROLES.FORESTER]:      _foresterPerms,
    [ROLES.FOREST_GUARD]:  _fieldGuardPerms,

    // Legacy SaaS Roles
    [ROLES.VIEWER]:        _viewerPerms,
    [ROLES.OPERATOR]:      _operatorPerms,
    [ROLES.ANALYST]:       _analystPerms,
    [ROLES.ADMINISTRATOR]: _adminPerms,
  });

  // ── DEV SIMULATOR STATE ───────────────────────────────────────────
  const DEV_ROLE_SESSION_KEY = "vana_dev_role";
  const DEV_JURISDICTION_SESSION_KEY = "vana_dev_jurisdiction";

  // Default Jurisdiction mapping per role for simulation
  const DEFAULT_SIMULATED_JURISDICTIONS = Object.freeze({
    pccf_hoff:     { id: "MH-STATE",      name: "Maharashtra State (All Jurisdictions)", level: "STATE" },
    apccf:         { id: "MH-STATE",      name: "Maharashtra State (State Verticals)",   level: "STATE" },
    ccf:           { id: "CIR-THN",       name: "Thane Forest Circle",                   level: "CIRCLE" },
    cf:            { id: "CIR-THN",       name: "Thane Forest Circle",                   level: "CIRCLE" },
    dcf_dfo:       { id: "DIV-THN-TERR",  name: "Thane Territorial Division",           level: "DIVISION" },
    acf:           { id: "DIV-THN-TERR",  name: "Thane Division (Kalyan Sub-Div)",       level: "SUBDIVISION" },
    rfo:           { id: "RNG-BHW",       name: "Bhiwandi Range",                        level: "RANGE" },
    forester:      { id: "SEC-DIVA",      name: "Diva Section",                          level: "SECTION" },
    forest_guard:  { id: "BEAT-KOPAR",    name: "Kopar Beat",                            level: "BEAT" },
    
    // Legacy
    viewer:        { id: "MH-STATE",      name: "Maharashtra State (Surveillance)",     level: "STATE" },
    operator:      { id: "DIV-THN-TERR",  name: "Thane Territorial Division",           level: "DIVISION" },
    analyst:       { id: "CIR-THN",       name: "Thane Forest Circle",                   level: "CIRCLE" },
    administrator: { id: "MH-STATE",      name: "Maharashtra State (System Wide)",       level: "STATE" },
  });

  function _devGetCurrentUser() {
    const storedRole = sessionStorage.getItem(DEV_ROLE_SESSION_KEY) || ROLES.VIEWER;
    const role = ROLE_PERMISSIONS[storedRole] ? storedRole : ROLES.VIEWER;
    const meta = ROLE_META[role] || ROLE_META[ROLES.VIEWER];
    const template = ROLE_TEMPLATES[role] || TEMPLATES.ADMIN;

    const defaultJur = DEFAULT_SIMULATED_JURISDICTIONS[role] || DEFAULT_SIMULATED_JURISDICTIONS.viewer;
    const storedJurId = sessionStorage.getItem(DEV_JURISDICTION_SESSION_KEY);
    
    let jurisdiction = defaultJur;
    if (storedJurId && window.VANA_HIERARCHY && window.VANA_HIERARCHY.getJurisdictionById) {
      const found = window.VANA_HIERARCHY.getJurisdictionById(storedJurId);
      if (found) {
        jurisdiction = { id: found.id, name: found.name, level: found.level };
      }
    }

    return {
      id:            "dev-simulated-session",
      name:          "Simulated Official (" + meta.label + ")",
      role:          role,
      roleLabel:     meta.label,
      rankTitle:     meta.rankTitle,
      template:      template,
      jurisdiction:  jurisdiction,
      permissions:   ROLE_PERMISSIONS[role],
      isDev:         true,
      isSimulation:  true,
    };
  }

  // ── PRODUCTION HOOK ───────────────────────────────────────────────
  // Replace this function body when connecting a real auth provider.
  // Must return: { id, name, role, roleLabel, permissions[], isDev: false }
  // or throw/return null to signal unauthenticated state.
  function _productionGetCurrentUser() {
    // Example (OAuth2 / backend session):
    //   const res = await fetch('/api/auth/me', { credentials: 'include' });
    //   if (!res.ok) return null; // unauthenticated
    //   return res.json();
    throw new Error(
      "[VANA Auth] Production auth not configured. " +
      "Set DEV_MODE=false only after implementing _productionGetCurrentUser()."
    );
  }

  // ── AUTH CHANGE LISTENERS ─────────────────────────────────────────
  const _listeners = [];

  function _notifyListeners(user) {
    _listeners.forEach(function (cb) { try { cb(user); } catch (e) {} });
  }

  // ── ACCESS DENIED RENDERER ─────────────────────────────────────────
  function _renderAccessDenied(permission) {
    return `
      <div class="admin-denied-state">
        <div class="admin-denied-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
        </div>
        <div class="admin-denied-title">Access Denied</div>
        <div class="admin-denied-msg">
          Your current role does not have the <span class="mono">${permission}</span> permission.<br>
          Contact an Administrator to request elevated access.
        </div>
        <div class="admin-denied-note">
          This is a frontend access gate. Backend authorization is enforced separately when backend endpoints are available.
        </div>
      </div>`;
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────
  window.VANA_AUTH = Object.freeze({
    ROLES,
    ROLE_META,
    TEMPLATES,
    ROLE_TEMPLATES,
    CAPABILITIES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    DEV_MODE,

    /** Returns the current user object with role, template & jurisdiction, or null if unauthenticated. */
    getCurrentUser: function () {
      try {
        return DEV_MODE ? _devGetCurrentUser() : _productionGetCurrentUser();
      } catch (e) {
        console.error("[VANA Auth] getCurrentUser failed:", e);
        return null;
      }
    },

    /** Returns current active template ('ADMIN' | 'OFFICER' | 'FIELD'). */
    getCurrentTemplate: function () {
      const user = this.getCurrentUser();
      return user ? user.template : TEMPLATES.ADMIN;
    },

    /** Returns true if the current user has the given permission. */
    hasPermission: function (permission) {
      const user = this.getCurrentUser();
      return !!(user && user.permissions && user.permissions.indexOf(permission) !== -1);
    },

    /**
     * Guards a container element. If the user lacks the permission,
     * injects the Access Denied state into containerEl and returns false.
     * Returns true if access is granted.
     */
    requirePermission: function (permission, containerEl) {
      if (!this.hasPermission(permission)) {
        if (containerEl) containerEl.innerHTML = _renderAccessDenied(permission);
        return false;
      }
      return true;
    },

    /**
     * DEV ONLY — Sets the simulated role. No-op in production mode.
     * Notifies all auth change listeners.
     */
    setDevRole: function (role) {
      if (!DEV_MODE) {
        console.warn("[VANA Auth] setDevRole() called in production mode — ignored.");
        return;
      }
      if (!ROLE_PERMISSIONS[role]) {
        console.warn("[VANA Auth] Unknown role:", role);
        return;
      }
      sessionStorage.setItem(DEV_ROLE_SESSION_KEY, role);
      // Reset jurisdiction to role default unless explicitly overridden
      sessionStorage.removeItem(DEV_JURISDICTION_SESSION_KEY);
      _notifyListeners(this.getCurrentUser());
    },

    /** DEV ONLY — Sets the simulated active jurisdiction scope. */
    setDevJurisdiction: function (jurisdictionId) {
      if (!DEV_MODE) return;
      sessionStorage.setItem(DEV_JURISDICTION_SESSION_KEY, jurisdictionId);
      _notifyListeners(this.getCurrentUser());
    },

    /** Register a callback invoked whenever the auth state changes. */
    onAuthChange: function (callback) {
      _listeners.push(callback);
    },
  });

  console.log(
    "[VANA Auth] Initialized —",
    DEV_MODE
      ? "DEV simulator mode active with Forest Dept Hierarchy (Role stored in sessionStorage, non-authoritative)"
      : "Production auth mode"
  );
})();
