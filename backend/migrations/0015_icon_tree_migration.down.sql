ALTER TABLE tenant_desktop_layouts ADD COLUMN icons JSONB NOT NULL DEFAULT '[]';

UPDATE tenant_desktop_layouts
SET icons = icon_tree
WHERE jsonb_typeof(icon_tree) = 'array'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(icon_tree) AS elem
    WHERE elem ? 'children'
  );

ALTER TABLE tenant_desktop_layouts DROP COLUMN icon_tree;
