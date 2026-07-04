ALTER TABLE tenant_desktop_layouts ADD COLUMN icons JSONB;

-- Down migration cannot flatten nested icon_tree data. Raise an error if
-- unsupported nested data exists so the operator can handle it manually.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM tenant_desktop_layouts
    WHERE jsonb_typeof(icon_tree) = 'array'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(icon_tree) AS elem
        WHERE elem ? 'children'
      )
  ) THEN
    RAISE EXCEPTION 'Down migration cannot flatten nested icon_tree data. Please handle manually.';
  END IF;
END $$;

UPDATE tenant_desktop_layouts
SET icons = CASE
    WHEN jsonb_typeof(icon_tree) = 'array' THEN icon_tree
    ELSE '[]'::jsonb
END;

ALTER TABLE tenant_desktop_layouts ALTER COLUMN icons SET NOT NULL;

ALTER TABLE tenant_desktop_layouts DROP COLUMN icon_tree;
