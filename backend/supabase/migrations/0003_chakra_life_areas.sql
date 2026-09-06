-- 0003: Chakra-mapped life areas (Trevor, Sept 2026).
-- Replaces the original 7 life areas with the root→crown set adopted from
-- the Meta AI reference conversation (backend/reference/meta-intake-reference.json).
-- Existing rows are test data only; mapping below is semantic best-fit.

alter type life_area rename to life_area_old;

create type life_area as enum (
  'health_body',              -- Root · Foundation
  'emotions_creativity',      -- Sacral · Flow
  'career_purpose',           -- Solar Plexus · Drive
  'relationships_love',       -- Heart · Connection
  'communication_expression', -- Throat · Voice
  'mindset_growth',           -- Third Eye · Clarity
  'spirit_purpose'            -- Crown · Unity
);

alter table goals
  alter column area type life_area
  using (case area::text
    when 'spiritual'      then 'spirit_purpose'
    when 'financial'      then 'career_purpose'
    when 'relationships'  then 'relationships_love'
    when 'family'         then 'relationships_love'
    when 'social'         then 'communication_expression'
    when 'fitness_health' then 'health_body'
    when 'business'       then 'career_purpose'
  end)::life_area;

drop type life_area_old;
