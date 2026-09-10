-- 0004: catch-all life area (Sept 9, 2026).
-- After the seven chakra areas, the intake asks once whether anything else
-- belongs in the practice. An answer is stored as an optional 8th goal in this
-- area; a decline ends the intake at seven. 'open_capture' is deliberately NOT
-- a chakra — it never lights a progress segment and is not in LIFE_AREAS.
--
-- Landed alongside the removal of the two hardcoded "identity" affirmations
-- that used to be appended to every set: every affirmation now traces back to
-- something the user actually said.

alter type life_area add value if not exists 'open_capture';
