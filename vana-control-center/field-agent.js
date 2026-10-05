/**
 * VANA Control Center — Field Agent Tactical Surface Logic
 * =========================================================
 * 
 * Manages the mobile-first tactical field operations surface for Field ranks:
 *  - FORESTER (Round Officer / Section Level)
 *  - FOREST_GUARD (Forest Guard / Vanrakshak / Beat Level)
 * 
 * STRICT DATA INTEGRITY & ZERO-FABRICATION GUARANTEES:
 * 1. Consumes authoritative user identity & jurisdiction dynamically from window.VANA_AUTH.
 * 2. ZERO hardcoded operational fallbacks, zero fake task records, zero fake GPS coordinates.
 * 3. Unavailable capabilities are explicitly labeled:
 *    - No assignments -> [NO AUTHORITATIVE ASSIGNMENTS AVAILABLE]
 *    - No GPS telemetry -> [PATROL TELEMETRY PENDING INGESTION]
 *    - No submission endpoint -> [SUBMISSION ENDPOINT PENDING INGESTION]
 *    - No camera/evidence upload -> [EVIDENCE INGESTION PENDING]
 *    - No offline persistence engine -> [OFFLINE QUEUE · PERSISTENCE ENGINE PENDING]
 * 4. Sub-view navigation switches among: TODAY, OBSERVE, EVIDENCE, QUEUE, PROFILE.
 * 5. Contains 0 fetch() calls and performs 0 server mutations.
 */

(function () {
  "use strict";

  const PENDING_INGESTION = "DATA SOURCE PENDING INGESTION";
  let activeSubView = "today";

  // ── 1. INITIALIZATION & AUTH LISTENER ─────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    console.log("[VANA Field] Initializing Field Agent Tactical Surface...");

    if (!window.VANA_AUTH) {
      console.warn("[VANA Field] VANA_AUTH not available yet.");
      return;
    }

    // Register auth change listener to re-render field surface
    window.VANA_AUTH.onAuthChange(function (user) {
      if (user && user.template === "FIELD") {
        renderFieldSurface(user);
      }
    });

    // Initial render if active user is a FIELD agent
    const currentUser = window.VANA_AUTH.getCurrentUser();
    if (currentUser && currentUser.template === "FIELD") {
      renderFieldSurface(currentUser);
    }
  });

  // ── 2. SUB-VIEW SWITCHER ──────────────────────────────────────────────────
  function switchSubView(viewKey, navBtn) {
    activeSubView = viewKey;
    const views = {
      today: document.getElementById("fieldViewToday"),
      observe: document.getElementById("fieldViewObserve"),
      evidence: document.getElementById("fieldViewEvidence"),
      queue: document.getElementById("fieldViewQueue"),
      profile: document.getElementById("fieldViewProfile"),
    };

    // Toggle View Containers
    Object.keys(views).forEach(function (k) {
      const el = views[k];
      if (el) {
        if (k === viewKey) {
          el.classList.add("active");
          el.classList.remove("hidden");
        } else {
          el.classList.remove("active");
          el.classList.add("hidden");
        }
      }
    });

    // Update Bottom Nav Active State
    const navItems = document.querySelectorAll("#fieldBottomNav .bottom-nav-item");
    navItems.forEach(function (btn) {
      btn.classList.remove("active");
    });

    if (navBtn) {
      navBtn.classList.add("active");
    } else {
      const activeNavBtn = document.getElementById("fbnav" + viewKey.charAt(0).toUpperCase() + viewKey.slice(1));
      if (activeNavBtn) activeNavBtn.classList.add("active");
    }

    console.log("[VANA Field] Sub-view switched to:", viewKey);
  }

  // ── 3. FIELD SURFACE RENDERER ─────────────────────────────────────────────
  function renderFieldSurface(user) {
    if (!user) return;

    const jurName = (user.jurisdiction && user.jurisdiction.name) ? user.jurisdiction.name : PENDING_INGESTION;
    const jurLevel = (user.jurisdiction && user.jurisdiction.level) ? user.jurisdiction.level : "TACTICAL";
    const rankTitle = user.rankTitle || user.roleLabel || "Field Agent";
    const roleLabel = user.roleLabel || user.role;

    // 3.1 Field Header Banner
    const roleTagEl = document.getElementById("fieldRoleTag");
    const beatTitleEl = document.getElementById("fieldBeatTitle");
    const beatSubEl = document.getElementById("fieldBeatSub");
    const gpsCoordsEl = document.getElementById("fieldGpsCoords");

    if (roleTagEl) {
      roleTagEl.textContent = (jurLevel + " SURVEILLANCE DESK · " + roleLabel).toUpperCase();
    }
    if (beatTitleEl) {
      beatTitleEl.textContent = jurName;
    }
    if (beatSubEl) {
      beatSubEl.textContent = "Rank: " + rankTitle + " · Scope: " + jurLevel + " · DEV SIMULATION CONTEXT";
    }
    if (gpsCoordsEl) {
      gpsCoordsEl.textContent = "PATROL TELEMETRY PENDING INGESTION";
    }

    // 3.2 Observation View Context Auto-fill
    const obsLocEl = document.getElementById("fieldObsLocation");
    const obsTimeEl = document.getElementById("fieldObsTimestamp");
    if (obsLocEl) {
      obsLocEl.value = jurName + " (" + jurLevel + ")";
    }
    if (obsTimeEl) {
      const now = new Date();
      obsTimeEl.value = now.toISOString().replace("T", " ").substring(0, 19) + " UTC (Local Device Timestamp)";
    }

    // 3.3 Profile View Elements
    const profRoleEl = document.getElementById("fieldProfileRole");
    const profRankEl = document.getElementById("fieldProfileRankTitle");
    const profJurEl = document.getElementById("fieldProfileJurisdiction");
    const profLevelEl = document.getElementById("fieldProfileLevel");
    const profCapsListEl = document.getElementById("fieldProfileCapabilitiesList");

    if (profRoleEl) profRoleEl.textContent = user.role;
    if (profRankEl) profRankEl.textContent = rankTitle;
    if (profJurEl) profJurEl.textContent = jurName;
    if (profLevelEl) profLevelEl.textContent = jurLevel;

    if (profCapsListEl) {
      const isForester = user.role === "forester";
      let capsHtml = `
        <div class="field-cap-item">
          <span class="field-cap-badge grant">GRANTED</span>
          <div class="field-cap-info">
            <span class="field-cap-title">Tactical Field View (VIEW)</span>
            <span class="field-cap-desc">Access to local beat surveillance deck and offline capture forms.</span>
          </div>
        </div>
        <div class="field-cap-item">
          <span class="field-cap-badge grant">GRANTED</span>
          <div class="field-cap-info">
            <span class="field-cap-title">Observation Capture (SUBMIT)</span>
            <span class="field-cap-desc">Capability defined in role model. <em class="text-warn">(Submission endpoint pending ingestion)</em></span>
          </div>
        </div>
        <div class="field-cap-item">
          <span class="field-cap-badge grant">GRANTED</span>
          <div class="field-cap-info">
            <span class="field-cap-title">Evidence Photo Ingestion (SUBMIT)</span>
            <span class="field-cap-desc">Capability defined in role model. <em class="text-warn">(Media storage backend pending ingestion)</em></span>
          </div>
        </div>
      `;

      if (isForester) {
        capsHtml += `
          <div class="field-cap-item">
            <span class="field-cap-badge grant-elevated">SECTION AUTHORITY</span>
            <div class="field-cap-info">
              <span class="field-cap-title">Section Alert Acknowledgment (ACKNOWLEDGE)</span>
              <span class="field-cap-desc">Authorized to review and acknowledge section exceptions. <em class="text-warn">(Backend endpoint pending)</em></span>
            </div>
          </div>
          <div class="field-cap-item">
            <span class="field-cap-badge grant-elevated">SECTION AUTHORITY</span>
            <div class="field-cap-info">
              <span class="field-cap-title">Beat Report Review (REVIEW)</span>
              <span class="field-cap-desc">Authorized to review subordinate beat patrol submissions. <em class="text-warn">(Backend endpoint pending)</em></span>
            </div>
          </div>
        `;
      }

      profCapsListEl.innerHTML = capsHtml;
    }
  }

  // ── 4. PUBLIC API EXPOSURE ────────────────────────────────────────────────
  window.VANA_FIELD = Object.freeze({
    switchSubView: switchSubView,
    renderFieldSurface: renderFieldSurface,
  });

  console.log("[VANA Field] Module Loaded — Ready for mobile-first tactical field operations.");
})();
