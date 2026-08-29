# VANA / Prakriti — Cross-Group Runtime Viewer

A single-page, read-only dashboard that traces one observation through the full BHIV runtime chain — **Observation (Group 3) → Canonical Record (Group 1) → Context & Decision (Group 2) → Governed Outcome (Group 4)** — without hardcoding, inventing, or hiding any field.

This is the unified integration surface referenced in the BHIV UI/UX task: one dashboard, not four separate group screens. Each group contributes its runtime/API output; this repo defines the shared shell, lineage presentation, and evidence-state vocabulary they're shown through.

## Files

| File | What it is |
|---|---|
| `vana-lineage-viewer-1.html` | The dashboard itself. Single file, no build step, no dependencies beyond a CDN font load. |
| `README-2.md` | Runtime integration documentation, contract boundaries, CORS instructions, and endpoint references. |

---

## Running the Dashboard

### Recommended: Serve from a local HTTP origin
When opening HTML files directly via `file://`, modern browsers assign the document an origin of `null`. If remote API servers do not allow origin `null` via CORS, browser `fetch()` calls will be blocked.

To serve from a standard HTTP origin:
```bash
# In the dashboard directory:
python -m http.server 8000
```
Then navigate to:
**[http://localhost:8000/vana-lineage-viewer-1.html](http://localhost:8000/vana-lineage-viewer-1.html)**

---

## Deployed Runtime Endpoints

| Group | Role | Live Endpoint | Method | Authoritative Data |
|---|---|---|---|---|
| **Group 1** | Canonical MasterDB API | `http://163.128.209.18:8013` | `GET /health`<br>`GET /observations/{observation_id}` | `canonical_record_id: "CR-b4615a27-7ab1-4bde-a078-a56fa0f2414c"` |
| **Group 2** | Context & Decision Brain | `https://niyantran.blackholeinfiverse.com/api/group2/context/resolve` | `POST` | `ruling: "ABSTAIN"`, `context_id: null`, `action_eligibility: false`, `abstention_required: true` |
| **Group 3** | Raw Observation & Sensor Data | Embedded in Group 1 retrieval envelope | `GET` (via Group 1) | Raw measurements, location, synthetic state (`CONTROLLED`) |
| **Group 4** | Intake Runtime & Governed Outcome | `http://163.128.209.18:8010/vana/execute` | `POST` | `status: "governed_abstention"`, `decision_action: "noop"`, `abstention_record_id: "abstention-f71045f1c36d34de27f585e9"` |

---

## Backend CORS Configuration (For Deployment Operators)

If running or updating the FastAPI services for Group 1 (`8013`) and Group 4 (`8010`), add the standard FastAPI CORS middleware to permit browser JavaScript invocation:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VANA MasterDB / Pravah Intake API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## What the Dashboard Guarantees

These are hard rules, not preferences — if a change breaks one of these, it's a regression:

- **Strict Fail-Closed Execution Order**:
  - Group 1 must resolve `canonical_record_id` before Group 2 or Group 4 are invoked.
  - If Group 1 fails or is blocked by browser CORS, the pipeline halts immediately.
  - Group 4 is **never** invoked with `canonical_record_id: null`.
- **The canonical `observation_id` is pinned in a sticky header and never replaced** by any downstream ID (canonical record, context, action request, or abstention record).
- **Nothing is invented.** A missing field renders as `NOT VERIFIED`, `PENDING`, or `GAP` — never blank, never guessed, never carried over from a previous observation.
- **A Governed Abstention is never shown as an Action Request.** The final stage's title, ID label, and color are driven only by `action_eligibility` / `abstention_required` / `action_request` — never defaulted to the "normal" action path.
- **No `mode: "no-cors"` bypass.** The dashboard never uses opaque `no-cors` mode, which prevents reading response JSON.
- **Live Mode and Sample Mode are strictly separate.** Demo/sample payloads are never used during LIVE mode execution.
