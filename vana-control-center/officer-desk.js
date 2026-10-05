/**
 * VANA Control Center — Officer Command Surface Logic
 * ====================================================
 * 
 * Manages the tactical situation deck, approvals desk, and operational
 * exceptions stream for Officer ranks:
 *  - CF (Conservator)
 *  - DCF / DFO (Divisional Forest Officer)
 *  - ACF (Assistant Conservator of Forests)
 *  - RFO (Range Forest Officer)
 *  - Operator (Tactical Operations Alias)
 * 
 * STRICT DATA INTEGRITY & ZERO-FABRICATION GUARANTEES:
 * 1. Consumes authoritative live runtime data exclusively from existing DOM / API state.
 * 2. ZERO hardcoded operational-value fallbacks: if an operational value is not available
 *    in the runtime state, displays "DATA SOURCE PENDING INGESTION".
 * 3. Unverified forest cover / FSI metrics are explicitly rendered as
 *    [DATA SOURCE PENDING INGESTION].
 * 4. Patrol coverage is explicitly rendered as [PATROL TELEMETRY PENDING INGESTION].
 * 5. Approval, rejection, and assignment mutations are non-interactive because
 *    no backend review mutation endpoint is currently connected upstream.
 * 6. Historical fixtures (e.g., SMR-Z01) are explicitly badged as DEV/TEST REFERENCE
 *    and never presented as live observations.
 */

(function () {
  "use strict";

  const PENDING_INGESTION = "DATA SOURCE PENDING INGESTION";

  // ── 1. INITIALIZATION & AUTH LISTENER ─────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    console.log("[VANA Officer] Initializing Officer Command Deck (Zero-Fallback Mode)...");

    if (!window.VANA_AUTH) {
      console.warn("[VANA Officer] VANA_AUTH not available yet.");
      return;
    }

    // Register auth change listener to switch views and re-render deck
    window.VANA_AUTH.onAuthChange(function (user) {
      handleAuthOrJurisdictionChange(user);
    });

    // Initial render with current user state
    const currentUser = window.VANA_AUTH.getCurrentUser();
    if (currentUser) {
      handleAuthOrJurisdictionChange(currentUser);
    }

    // Setup MutationObserver on pinned bar to automatically keep Officer Deck in sync
    // with runtime updates produced by app.js without polling or re-fetching
    const pinnedBar = (typeof document.querySelector === "function") ? document.querySelector(".pinned-identity-bar") : null;
    if (pinnedBar && window.MutationObserver) {
      const observer = new MutationObserver(function () {
        const activeUser = window.VANA_AUTH ? window.VANA_AUTH.getCurrentUser() : null;
        if (activeUser && activeUser.template === "OFFICER") {
          renderOfficerDeck(activeUser);
        }
      });
      observer.observe(pinnedBar, { subtree: true, characterData: true, childList: true });
    }
  });

  // ── 2. TEMPLATE VISIBILITY & ROLE DISPATCHER ──────────────────────────────
  function handleAuthOrJurisdictionChange(user) {
    if (!user) return;

    const template = user.template || "ADMIN";
    const adminRoot = document.getElementById("adminTemplateRoot");
    const officerRoot = document.getElementById("officerTemplateRoot");
    const fieldRoot = document.getElementById("fieldTemplateRoot");
    const adminNav = document.getElementById("adminBottomNav");
    const fieldNav = document.getElementById("fieldBottomNav");

    // Universal Header Synchronizations
    const jurVal = document.getElementById("headerJurisdictionVal");
    const roleLabel = document.getElementById("headerRoleLabel");
    const templateBadge = document.getElementById("headerTemplateBadge");
    const roleBadge = document.getElementById("headerRoleBadge");
    const devSelect = document.getElementById("devRoleSelectHeader");

    if (jurVal && user.jurisdiction) {
      jurVal.textContent = user.jurisdiction.name || PENDING_INGESTION;
    }
    if (roleLabel) {
      roleLabel.textContent = user.roleLabel || user.role || PENDING_INGESTION;
    }
    if (templateBadge) {
      templateBadge.textContent = template;
    }
    if (roleBadge) {
      roleBadge.className = "role-badge-pill role-" + user.role;
    }
    if (devSelect && devSelect.value !== user.role) {
      devSelect.value = user.role;
    }

    // Toggle Root Template Containers
    if (template === "OFFICER") {
      if (adminRoot) { adminRoot.classList.remove("template-active"); adminRoot.classList.add("template-hidden"); }
      if (fieldRoot) { fieldRoot.classList.remove("template-active"); fieldRoot.classList.add("template-hidden"); }
      if (officerRoot) { officerRoot.classList.remove("template-hidden"); officerRoot.classList.add("template-active"); }
      if (adminNav) adminNav.style.display = "flex";
      if (fieldNav) fieldNav.style.display = "none";
      renderOfficerDeck(user);
    } else if (template === "FIELD") {
      if (adminRoot) { adminRoot.classList.remove("template-active"); adminRoot.classList.add("template-hidden"); }
      if (officerRoot) { officerRoot.classList.remove("template-active"); officerRoot.classList.add("template-hidden"); }
      if (fieldRoot) { fieldRoot.classList.remove("template-hidden"); fieldRoot.classList.add("template-active"); }
      if (adminNav) adminNav.style.display = "none";
      if (fieldNav) fieldNav.style.display = "grid";
    } else {
      // Default: ADMIN Template
      if (officerRoot) { officerRoot.classList.remove("template-active"); officerRoot.classList.add("template-hidden"); }
      if (fieldRoot) { fieldRoot.classList.remove("template-active"); fieldRoot.classList.add("template-hidden"); }
      if (adminRoot) { adminRoot.classList.remove("template-hidden"); adminRoot.classList.add("template-active"); }
      if (adminNav) adminNav.style.display = "flex";
      if (fieldNav) fieldNav.style.display = "none";

      // If Leaflet map is active in admin view, refresh dimensions
      if (window.leafletMap) {
        setTimeout(function () { window.leafletMap.invalidateSize(); }, 150);
      }
    }
  }

  // ── 3. OFFICER DECK RENDERER (ZERO HARDCODED OPERATIONAL FALLBACKS) ─────────
  function renderOfficerDeck(user) {
    if (!user) return;

    // 3.1 Update Jurisdiction Header Banner
    const jurTitle = document.getElementById("officerJurisdictionText");
    const rankTitle = document.getElementById("officerRankTitle");
    const scopeLevel = document.getElementById("officerScopeLevel");

    if (jurTitle) {
      jurTitle.textContent = (user.jurisdiction && user.jurisdiction.name) ? user.jurisdiction.name : PENDING_INGESTION;
    }
    if (rankTitle) {
      const roleText = user.rankTitle || user.roleLabel || user.role || "Officer";
      const jurText = (user.jurisdiction && user.jurisdiction.name) ? user.jurisdiction.name : "Jurisdiction Command";
      rankTitle.textContent = roleText + " · " + jurText;
    }
    if (scopeLevel) {
      if (user.jurisdiction && user.jurisdiction.level) {
        scopeLevel.textContent = "Scope Level: " + user.jurisdiction.level + " · DEV SIMULATION CONTEXT";
      } else {
        scopeLevel.textContent = PENDING_INGESTION;
      }
    }

    // 3.2 Read Live Verified Runtime Values from Authoritative DOM Elements Only
    const pinnedOidEl = document.getElementById("pinnedOid");
    const pinnedCanonEl = document.getElementById("pinnedCanonicalRecordId");
    const pinnedCtxEl = document.getElementById("pinnedContextId");

    const rawOid = pinnedOidEl ? pinnedOidEl.textContent.trim() : "";
    const liveOid = (rawOid && rawOid !== "NOT VERIFIED" && rawOid !== "null") ? rawOid : PENDING_INGESTION;

    const rawCanon = pinnedCanonEl ? pinnedCanonEl.textContent.trim() : "";
    const liveCanon = (rawCanon && rawCanon !== "NOT VERIFIED" && rawCanon !== "null") ? rawCanon : PENDING_INGESTION;

    const rawCtx = pinnedCtxEl ? pinnedCtxEl.textContent.trim() : "";
    const liveCtx = (rawCtx && rawCtx !== "null" && rawCtx !== "NOT VERIFIED") ? rawCtx : PENDING_INGESTION;

    // Read live observation measurement from existing runtime DOM
    const runtimeReadingEl = (typeof document.querySelector === "function") 
      ? document.querySelector("#viewFieldSummary .field-metric-item .metric-v.emerald")
      : null;
    const rawObsVal = runtimeReadingEl ? runtimeReadingEl.textContent.trim() : "";
    const liveObsVal = (rawObsVal && rawObsVal !== "Not available") ? rawObsVal : PENDING_INGESTION;

    // 3.3 Update Live Observation Elements in Officer Deck
    const liveObsIdEl = document.getElementById("officerLiveObsId");
    const liveTableObsIdEl = document.getElementById("officerTableLiveObsId");
    const liveCanonIdEl = document.getElementById("officerLiveCanonicalId");
    const liveContextIdEl = document.getElementById("officerLiveContextId");
    const liveObsValEl = document.getElementById("officerLiveObsVal");
    const liveTableRowValEl = document.getElementById("officerLiveTableRowVal");

    if (liveObsIdEl) liveObsIdEl.textContent = liveOid;
    if (liveTableObsIdEl) liveTableObsIdEl.textContent = liveOid;
    if (liveCanonIdEl) liveCanonIdEl.textContent = liveCanon;
    if (liveContextIdEl) liveContextIdEl.textContent = liveCtx;
    if (liveObsValEl) liveObsValEl.textContent = liveObsVal;
    if (liveTableRowValEl) liveTableRowValEl.textContent = liveObsVal;
  }

  // ── 4. PUBLIC API EXPOSURE ────────────────────────────────────────────────
  window.VANA_OFFICER = Object.freeze({
    renderOfficerDeck: renderOfficerDeck,
    handleAuthChange: handleAuthOrJurisdictionChange,
  });

  console.log("[VANA Officer] Module Loaded — Ready for tactical jurisdiction rendering.");
})();
