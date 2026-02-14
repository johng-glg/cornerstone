ALTER TABLE eligibility_reviews
ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[
  {"step": "agreement_sent", "completed": false, "completed_at": null, "completed_by": null},
  {"step": "agreement_signed", "completed": false, "completed_at": null, "completed_by": null},
  {"step": "paperwork_received", "completed": false, "completed_at": null, "completed_by": null},
  {"step": "documents_verified", "completed": false, "completed_at": null, "completed_by": null}
]'::jsonb;