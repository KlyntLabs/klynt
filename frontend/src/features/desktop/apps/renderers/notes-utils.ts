export function getText(content: Record<string, unknown>): string {
  const text = content.text;
  return typeof text === "string" ? text : "";
}
