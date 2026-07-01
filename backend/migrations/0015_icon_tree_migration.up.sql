ALTER TABLE tenant_desktop_layouts ADD COLUMN icon_tree JSONB NOT NULL DEFAULT '[]';

UPDATE tenant_desktop_layouts
SET icon_tree = CASE
    WHEN icons IS NOT NULL AND jsonb_typeof(icons) = 'array'
    THEN icons
    ELSE '[]'::jsonb
END;

ALTER TABLE tenant_desktop_layouts DROP COLUMN icons;
