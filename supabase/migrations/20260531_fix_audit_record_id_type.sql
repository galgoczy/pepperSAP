-- =============================================================================
-- Hibajavítás: Pepper Placc üzenetküldés - record_id típus eltérés
-- Készült: 2026-05-31
--
-- Tünet: a Pepper Placc-ban üzenet küldésekor:
--   "column \"record_id\" is of type uuid but expression is of type text"
--
-- Ok: az audit_trigger_func() az audit_log.record_id oszlopba NEW.id::TEXT
--     értéket ír (lásd 20260531_fix_audit_triggers.sql:32-33,48-49,55-56), és a
--     kanonikus séma szerint a record_id TEXT típusú (20260209_audit_log.sql:10
--     "record_id TEXT NOT NULL -- UUID as text for flexibility"). Az éles
--     adatbázisban viszont ezt az oszlopot egy régebbi definíció UUID típussal
--     hozta létre, így a TEXT érték beszúrása hibára fut, és visszagörgeti a
--     Placc-üzenet beszúrását is.
--
-- Megoldás: az oszlop típusát a kanonikus TEXT-re állítjuk. Ha az oszlop már
--     TEXT, az ALTER ... TYPE TEXT gyakorlatilag no-op. Idempotens.
-- =============================================================================

ALTER TABLE audit_log
  ALTER COLUMN record_id TYPE TEXT USING record_id::text;
