import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { MenuEditor, type MenuEditorProps } from "./menu-editor";
import { type ContextMenuSchema } from "./menu-schema";

function createSchema(overrides: Partial<ContextMenuSchema> = {}): ContextMenuSchema {
  return {
    id: "test-schema",
    root: [
      {
        type: "item",
        id: "item-1",
        label: "Open",
        action: "app:open",
      },
      {
        type: "separator",
      },
      {
        type: "group",
        id: "group-1",
        label: "Manage",
        children: [],
      },
    ],
    ...overrides,
  };
}

function MenuEditorHarness({
  initialSchema,
  onChange = vi.fn(),
  readOnly,
}: {
  initialSchema: ContextMenuSchema;
  onChange?: (schema: ContextMenuSchema) => void;
  readOnly?: boolean;
}) {
  const [schema, setSchema] = useState(initialSchema);
  const handleChange = useCallback(
    (next: ContextMenuSchema) => {
      setSchema(next);
      onChange(next);
    },
    [onChange]
  );

  const props: MenuEditorProps = {
    schema,
    onChange: handleChange,
    readOnly,
  };

  return <MenuEditor {...props} />;
}

describe("MenuEditor", () => {
  it("renders item labels, separators, and groups from the schema", () => {
    render(<MenuEditor schema={createSchema()} onChange={vi.fn()} />);

    expect(screen.getByDisplayValue("Open")).toBeInTheDocument();
    expect(screen.getByText("Action: app:open")).toBeInTheDocument();
    expect(screen.getByTestId("menu-separator")).toBeInTheDocument();
    expect(screen.getByText("Manage")).toBeInTheDocument();
  });

  it("updates the item label when the input changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MenuEditorHarness initialSchema={createSchema()} onChange={onChange} />);

    const input = screen.getByDisplayValue("Open");
    await user.clear(input);
    await user.type(input, "Launch");

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        root: expect.arrayContaining([
          expect.objectContaining({
            id: "item-1",
            label: "Launch",
          }),
        ]),
      })
    );
  });

  it("toggles the disabled state when the checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MenuEditorHarness initialSchema={createSchema()} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Disabled" }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        root: expect.arrayContaining([
          expect.objectContaining({
            id: "item-1",
            disabled: true,
          }),
        ]),
      })
    );
  });

  it("removes an item when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MenuEditorHarness initialSchema={createSchema()} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /delete open/i }));

    const calls = onChange.mock.calls;
    const lastCall = calls[calls.length - 1]?.[0] as ContextMenuSchema;
    expect(lastCall.root).toHaveLength(2);
    expect(lastCall.root.some((entry) => entry.type === "item" && entry.id === "item-1")).toBe(
      false
    );
  });

  it("appends a new item when Add Item is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MenuEditorHarness initialSchema={createSchema()} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /add item/i }));

    const calls = onChange.mock.calls;
    const lastCall = calls[calls.length - 1]?.[0] as ContextMenuSchema;
    expect(lastCall.root).toHaveLength(4);
    expect(lastCall.root[lastCall.root.length - 1]).toEqual(
      expect.objectContaining({
        type: "item",
        label: "New Item",
        action: "custom:new-action",
      })
    );
  });

  it("appends a separator when Add Separator is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MenuEditorHarness initialSchema={createSchema()} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /add separator/i }));

    const calls = onChange.mock.calls;
    const lastCall = calls[calls.length - 1]?.[0] as ContextMenuSchema;
    expect(lastCall.root).toHaveLength(4);
    expect(lastCall.root[lastCall.root.length - 1]).toEqual({ type: "separator" });
  });

  it("disables inputs and hides edit controls in read-only mode", () => {
    render(<MenuEditor schema={createSchema()} onChange={vi.fn()} readOnly />);

    expect(screen.getByDisplayValue("Open")).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Disabled" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add item/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add separator/i })).not.toBeInTheDocument();
  });
});
