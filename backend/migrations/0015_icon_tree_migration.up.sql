ALTER TABLE tenant_desktop_layouts ADD COLUMN icon_tree JSONB DEFAULT '[]';

UPDATE tenant_desktop_layouts
SET icon_tree = CASE
    WHEN icons IS NOT NULL AND jsonb_typeof(icons) = 'array'
    THEN icons
    ELSE '[]'::jsonb
END;

ALTER TABLE tenant_desktop_layouts ALTER COLUMN icon_tree SET NOT NULL;

ALTER TABLE tenant_desktop_layouts DROP COLUMN icons;
