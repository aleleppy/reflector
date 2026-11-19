export const FIELD_NAMES = [
  "cents",
  "label",
  "kind",
  "unit",
  "value",
  "hint",
  "mixed",
  "opaque",
  "bag",
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];
