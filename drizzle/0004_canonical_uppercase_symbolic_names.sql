-- 1. Drop existing lowercase check constraint for local_symbolic_name
ALTER TABLE solution_properties DROP CONSTRAINT IF EXISTS chk_prop_local_name;

-- 2. Upgrade existing solution_properties to uppercase local_symbolic_name and generated_technical_name
UPDATE solution_properties SET
  local_symbolic_name = UPPER(local_symbolic_name),
  generated_technical_name = UPPER(generated_technical_name);

-- 3. Add updated check constraint for local_symbolic_name
ALTER TABLE solution_properties ADD CONSTRAINT chk_prop_local_name CHECK (local_symbolic_name ~ '^[a-zA-Z][a-zA-Z0-9_]{0,52}$');

-- 4. Upgrade choice_lists keys to canonical uppercase <PREFIX>_LIST_<NAME> format safely
UPDATE choice_lists cl SET
  key = CASE
    WHEN cl.key LIKE s.solution_prefix || '_LIST_%' THEN UPPER(cl.key)
    ELSE SUBSTRING(s.solution_prefix || '_LIST_' || UPPER(REGEXP_REPLACE(cl.key, '^.*_list_', '')), 1, 58) || '_' || SUBSTRING(cl.id::text, 1, 5)
  END
FROM solutions s
WHERE cl.solution_id = s.id AND cl.key NOT LIKE s.solution_prefix || '_LIST_%';
