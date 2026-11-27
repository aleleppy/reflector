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

export const FORMAT_NAMES = [] as const;
export type FormatName = (typeof FORMAT_NAMES)[number];
