/**
 * VANA Control Center — Forest Department Hierarchy & Jurisdiction Registry
 * ==========================================================================
 * 
 * ⚠️ DEV/SIMULATION — NON-AUTHORITATIVE TEST CONTEXT ONLY ⚠️
 * 
 * This file defines the reference structural model for the Maharashtra
 * Forest Department organizational hierarchy (State -> Circle -> Division ->
 * Sub-Division -> Range -> Section -> Beat).
 * 
 * NOTICE & ANTI-FABRICATION GUARANTEES:
 * 1. This is NOT an official personnel database or authoritative government registry.
 * 2. All hierarchy trees and simulation personas provided here are strictly for
 *    local user interface development, template previewing, and client-side testing.
 * 3. In production, hierarchy structures and jurisdictional scopes will be resolved
 *    dynamically via authenticated government SSO / directory services (e.g., MahaGov SSO).
 * 4. No real forest staff credentials, personally identifiable information (PII),
 *    or classified beat boundary polygons are contained herein.
 * ==========================================================================
 */

(function () {
  "use strict";

  // ── 1. TEMPLATE CONSTANTS ─────────────────────────────────────────────────
  const TEMPLATES = Object.freeze({
    ADMIN:   "ADMIN",   // State & Circle macro-governance, system health, audit
    OFFICER: "OFFICER", // Division & Range command, alerts, approvals desk
    FIELD:   "FIELD",   // Section & Beat tactical view, mobile photo/evidence capture
  });

  // ── 2. ADMINISTRATIVE JURISDICTION LEVELS ─────────────────────────────────
  const JURISDICTION_LEVELS = Object.freeze({
    STATE:       { key: "STATE",       label: "State-Wide",    rankOrder: 1 },
    CIRCLE:      { key: "CIRCLE",      label: "Circle",        rankOrder: 2 },
    DIVISION:    { key: "DIVISION",    label: "Division",      rankOrder: 3 },
    SUBDIVISION: { key: "SUBDIVISION", label: "Sub-Division",  rankOrder: 4 },
    RANGE:       { key: "RANGE",       label: "Range",         rankOrder: 5 },
    SECTION:     { key: "SECTION",     label: "Section",       rankOrder: 6 },
    BEAT:        { key: "BEAT",        label: "Beat",          rankOrder: 7 },
  });

  // ── 3. SIMULATION JURISDICTION TREE (DEV CONTEXT ONLY) ─────────────────────
  // Sample structure covering active surveillance zones (e.g., Thane Creek / MMR)
  const SIMULATED_JURISDICTIONS = Object.freeze([
    {
      id: "MH-STATE",
      name: "Maharashtra State (All Jurisdictions)",
      level: JURISDICTION_LEVELS.STATE.key,
      code: "MH-STATE",
      circles: [
        {
          id: "CIR-THN",
          name: "Thane Forest Circle",
          level: JURISDICTION_LEVELS.CIRCLE.key,
          code: "THN-CIR",
          divisions: [
            {
              id: "DIV-THN-TERR",
              name: "Thane Territorial Division",
              level: JURISDICTION_LEVELS.DIVISION.key,
              code: "THN-DIV",
              ranges: [
                {
                  id: "RNG-BHW",
                  name: "Bhiwandi Range",
                  level: JURISDICTION_LEVELS.RANGE.key,
                  code: "BHW-RNG",
                  sections: [
                    {
                      id: "SEC-DIVA",
                      name: "Diva Section",
                      level: JURISDICTION_LEVELS.SECTION.key,
                      code: "DIVA-SEC",
                      beats: [
                        { id: "BEAT-KOPAR", name: "Kopar Beat", code: "KOP-BEAT" },
                        { id: "BEAT-MANDAL", name: "Mandal Beat", code: "MAN-BEAT" }
                      ]
                    }
                  ]
                },
                {
                  id: "RNG-VASAI",
                  name: "Vasai Range",
                  level: JURISDICTION_LEVELS.RANGE.key,
                  code: "VAS-RNG",
                  sections: [
                    {
                      id: "SEC-PELHAR",
                      name: "Pelhar Section",
                      level: JURISDICTION_LEVELS.SECTION.key,
                      code: "PEL-SEC",
                      beats: [
                        { id: "BEAT-PELHAR-01", name: "Pelhar Dam Beat", code: "PD-BEAT" }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: "CIR-MMCC",
          name: "Mumbai Mangrove Conservation Circle",
          level: JURISDICTION_LEVELS.CIRCLE.key,
          code: "MMCC-CIR",
          divisions: [
            {
              id: "DIV-MMCC-NORTH",
              name: "Mumbai Mangrove Conservation Unit (North)",
              level: JURISDICTION_LEVELS.DIVISION.key,
              code: "MMCC-N-DIV",
              ranges: [
                {
                  id: "RNG-TC-SANCTUARY",
                  name: "Thane Creek Flamingo Sanctuary Range",
                  level: JURISDICTION_LEVELS.RANGE.key,
                  code: "TCFS-RNG",
                  sections: [
                    {
                      id: "SEC-AIROLI",
                      name: "Airoli Coastal Section",
                      level: JURISDICTION_LEVELS.SECTION.key,
                      code: "AIR-SEC",
                      beats: [
                        { id: "BEAT-TC-Z03", name: "Thane Creek Z03 Beat", code: "TCZ03-BEAT" }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: "CIR-PUN",
          name: "Pune Forest Circle",
          level: JURISDICTION_LEVELS.CIRCLE.key,
          code: "PUN-CIR",
          divisions: [
            {
              id: "DIV-PUN-TERR",
              name: "Pune Division",
              level: JURISDICTION_LEVELS.DIVISION.key,
              code: "PUN-DIV",
              ranges: [
                {
                  id: "RNG-MAVAL",
                  name: "Maval Range",
                  level: JURISDICTION_LEVELS.RANGE.key,
                  code: "MVL-RNG",
                  sections: [
                    {
                      id: "SEC-LONAVALA",
                      name: "Lonavala Section",
                      level: JURISDICTION_LEVELS.SECTION.key,
                      code: "LON-SEC",
                      beats: [
                        { id: "BEAT-MV-Z01", name: "Maval Valley Beat", code: "MVZ01-BEAT" }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]);

  // ── 4. HELPER METHODS (READ-ONLY) ─────────────────────────────────────────
  function getJurisdictionById(id) {
    if (!id || id === "MH-STATE") return SIMULATED_JURISDICTIONS[0];
    
    // Recursive search in simulated hierarchy
    function findInTree(node) {
      if (node.id === id) return node;
      if (node.circles) {
        for (const c of node.circles) {
          const res = findInTree(c);
          if (res) return res;
        }
      }
      if (node.divisions) {
        for (const d of node.divisions) {
          const res = findInTree(d);
          if (res) return res;
        }
      }
      if (node.ranges) {
        for (const r of node.ranges) {
          const res = findInTree(r);
          if (res) return res;
        }
      }
      if (node.sections) {
        for (const s of node.sections) {
          const res = findInTree(s);
          if (res) return res;
        }
      }
      if (node.beats) {
        for (const b of node.beats) {
          if (b.id === id) return b;
        }
      }
      return null;
    }

    return findInTree(SIMULATED_JURISDICTIONS[0]) || null;
  }

  // ── 5. PUBLIC API EXPOSURE ────────────────────────────────────────────────
  window.VANA_HIERARCHY = Object.freeze({
    TEMPLATES,
    JURISDICTION_LEVELS,
    SIMULATED_JURISDICTIONS,
    getJurisdictionById,
    IS_SIMULATION: true,
  });

  console.log("[VANA Hierarchy] Initialized — DEV/SIMULATION context loaded (Non-authoritative).");
})();
