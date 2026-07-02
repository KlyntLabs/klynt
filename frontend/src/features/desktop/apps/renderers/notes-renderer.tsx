import { NotesEditor } from "./notes-editor";

type NotesRendererProps = {
  content: Record<string, unknown>;
  readOnly?: boolean;
  onChange?: (content: Record<string, unknown>) => void;
};

function getText(content: Record<string, unknown>): string {
  const text = content.text;
  return typeof text === "string" ? text : "";
}

export function NotesRenderer({
  content,
  readOnly = false,
  onChange,
}: NotesRendererProps): React.JSX.Element {
  const text = getText(content);

  if (readOnly) {
    return (
      <div
        className="h-full w-full overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-foreground shadow-elevation-1"
        data-testid="notes-readonly"
      >
        {text}
      </div>
    );
  }

  return <NotesEditor content={content} onChange={onChange ?? (() => {})} />;
}
