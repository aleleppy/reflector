export const FIELD_NAMES = [
  "key",
  "labels",
  "name",
  "rows",
  "bareRows",
  "columnGroups",
  "columnsByKey",
  "totals",
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];
