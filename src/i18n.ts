import pt from "./messages/pt.json";
import en from "./messages/en.json";
export const uiCopies = { pt, en };
export function translateUi(
  locale: string,
  key: string,
  values?: Record<string, string | number>,
): string {
  let value: unknown = locale.startsWith("pt") ? pt : en;
  for (const part of key.split("."))
    value =
      value && typeof value === "object"
        ? (value as Record<string, unknown>)[part]
        : undefined;
  return typeof value === "string"
    ? value.replace(/\{(\w+)\}/g, (match, name) =>
        String(values?.[name] ?? match),
      )
    : key;
}
