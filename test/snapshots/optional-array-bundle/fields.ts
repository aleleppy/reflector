export const FIELD_NAMES = [
  "success",
  "message",
  "id",
  "name",
  "requiredItems",
  "optionalItems",
  "nullableItems",
  "optionalNullableItems",
  "tags",
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];

export const FORMAT_NAMES = [] as const;
export type FormatName = (typeof FORMAT_NAMES)[number];
