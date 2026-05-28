## Phase 12 doc fix + PDF rebuild

**1. Edit `phase_12_summary.md`**
- Replace the "Communication log target" bullet under Schema with accurate description of the dual-table logging (client_communications for clients, entity_communications for litigation/creditor/lead).
- Update Acceptance item #5 to: *"Completed calls write to `client_communications` (client surfaces) or `entity_communications` (litigation, creditor, lead, etc.) with duration and signed recording link."*
- Remove the stale follow-up bullet about `contact_call_activity` since `entity_communications` already fills that role.

**2. Rebuild master PDF as `GLG_System_Specification_v4.pdf`**
- Reuse the existing build script with the updated phase_12_summary.md.
- QA: convert pages to images and inspect the Phase 12 section plus TOC page-numbers.

No code or DB changes.