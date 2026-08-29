# VANA / Prakriti — Cross-Group Runtime Viewer

A single-page, read-only dashboard that traces one observation through the full BHIV runtime chain — **Observation (Group 3) → Canonical Record (Group 1) → Context & Decision (Group 2) → Governed Outcome (Group 4)** — without hardcoding, inventing, or hiding any field.

This is the unified integration surface referenced in the BHIV UI/UX task: one dashboard, not four separate group screens. Each group contributes its runtime/API output; this repo defines the shared shell, lineage presentation, and evidence-state vocabulary they're shown through.

## Files

| File | What it is |
|---|---|
| `vana-lineage-viewer.html` | The dashboard itself. Single file, no build step, no dependencies beyond a CDN font load. Open directly in a browser. |
| `bhiv-ui-ux-structure.md` | The design/structure spec: layout, lineage/drill-down pattern, evidence-state treatment, provenance pattern, error states, reusable components. Reference this before styling any other screen so it stays visually consistent with this one. |

## Running it

No install, no server required.

1. Open `vana-lineage-viewer.html` in any browser.
2. Choose a data source at the top:
   - **Connect live APIs** — enter each group's base URL (Group 1's is pre-filled) and fetch. The browser calls the endpoints directly; if that's blocked by CORS or mixed content, the dashboard says so honestly rather than falling back to fake data.
   - **Paste sample payload** — for offline walkthroughs or verifying a specific real response someone sent you. Paste the exact JSON a group gave you; nothing here is fabricated on your behalf.
3. Optionally paste a **Group 3 evidence pack** (field_applicability JSON) to correctly distinguish "structurally not applicable" fields (e.g. GNSS status on a weather-API observation) from genuine data gaps. Without it, the dashboard uses Group 3's documented defaults for `external_api` observations.

## What the dashboard guarantees

These are hard rules, not preferences — if a change breaks one of these, it's a regression:

- **The canonical `observation_id` is pinned in a sticky header and never replaced** by any downstream ID (canonical record, context, action request, or abstention record).
- **Nothing is invented.** A missing field renders as `NOT VERIFIED`, `PENDING`, or `GAP` — never blank, never guessed, never carried over from a previous observation.
- **Evidence classification, service uptime, and decision outcomes are three separate visual languages** and are never merged:
  - Evidence state (`CONTROLLED` / `LOCAL` / `SHARED` / `LIVE` / `BLOCKED` / `NOT_APPLICABLE`) — the badge
  - Service health (`/health` uptime) — the square gray/green/red chip
  - Decision/governed outcome (`ABSTAIN` / `ALLOW` / `DENY` / `BLOCK`) — the decision-block component
- **A Governed Abstention is never shown as an Action Request.** The final stage's title, ID label, and color are driven only by `action_eligibility` / `abstention_required` / `action_request` — never defaulted to the "normal" action path.
- **Structural non-applicability ≠ a data gap.** Fields that don't apply to a given capture method (e.g. GNSS status for an API-sourced weather observation) render as "Not applicable," distinct from a genuine missing value ("Not reported by source").
- **A declared, contract-documented gap is labeled as such**, not shown as a broken/missing field — e.g. a raw artifact that was never persisted at capture time shows `DECLARED GAP` with the contract reference, not `NOT VERIFIED`.
- **No live fetch is ever made to a third-party source URL from inside the UI.** Source URLs (e.g. Open-Meteo) are shown as a labeled reference link only ("live source — current value will differ from this record"), never auto-called, since the live value would silently contradict the recorded one.
- **License attribution travels with the value.** Wherever a third-party-sourced measurement is shown (currently Open-Meteo, CC-BY 4.0), the attribution line is shown alongside it, not just once somewhere else on the page.
- **The lineage thread reports real status.** A solid dot + solid card border means that stage has confirmed runtime data; a dashed dot + dashed border means that stage isn't integrated yet. This is functional, not decorative — don't remove it to "clean up" the look.

## Data model (what each group is expected to send)

The dashboard reads directly from what each group's own endpoint returns. Ownership boundaries matter and are enforced in the code — don't blur them when adding fields:

- **Group 3 owns**: raw observation identity, measurement, location, quality/calibration, provenance, integrity, and source fields. Group 3 never sends `canonical_record_id`.
- **Group 1 owns**: the canonical record — `canonical_record_id` generation/resolution, retrieval status, idempotency (`IK-<observation_id>` convention, `200 IDEMPOTENT_REPLAY` / `409 IDEMPOTENCY_CONFLICT` / `201 ACCEPTED`). Group 1 does not originate any raw observation field.
- **Group 2 owns**: context resolution and decision (`context_status`, `decision`, `decision_reason`, `trace_id`, scientific context where applicable).
- **Group 4 owns**: the governed outcome — `ruling`, `action_eligibility`, `abstention_required`, `action_request`, `decision_type`, `decision_action`, and Authority/Doctrine/Semantic/Drift results where exposed.

Full field-level detail and the exact fallback/rendering rules are in `bhiv-ui-ux-structure.md`.

## Known open items

- **Group 4**: no live endpoint yet — the governed-outcome card is functionally correct (verified against a real payload) but only reachable via "Paste sample payload" until a base URL exists.
- **Group 1**: live CORS/auth behavior against the deployed API hasn't been confirmed from a browser context.
- **Group 2**: only the `ABSTAIN` decision path has been verified against a real response; `ALLOW`/`DENY` styling exists but is untested against live data. Field casing (camelCase vs snake_case) is defensively handled both ways pending confirmation.
- **Group 3**: raw artifact bytes were not persisted for the demonstrated Open-Meteo observation (declared gap, contract §26/§49.1) — this is expected and handled, not a bug. Observations captured going forward should have a real artifact to serve.

## Extending this for another group's screen

If a group builds its own screen instead of feeding this dashboard, reuse the components in `bhiv-ui-ux-structure.md` §6 (`badge`, `healthChip`, `nodeCard`, `decision-block`, `fieldVal`, `subsection`) rather than re-styling from scratch, so all screens read as one system.
