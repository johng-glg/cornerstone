-- Note provenance, so imported notes (e.g. from Forth) can be re-synced idempotently instead of
-- duplicated on re-import. `source` identifies the origin system; `external_id` is the source's
-- note id. Both nullable so manually-authored notes are unaffected.

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS external_id text;

-- de-dupe key for re-import: one row per (entity, source, external id)
CREATE UNIQUE INDEX IF NOT EXISTS notes_source_external_id_key
  ON public.notes (entity_type, entity_id, source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

COMMENT ON COLUMN public.notes.source IS 'Origin system for imported notes (e.g. ''forth''); null for in-app notes.';
COMMENT ON COLUMN public.notes.external_id IS 'Source system id for the note (e.g. Forth note_id).';
