export const FIELD_NAMES = [
  "success",
  "message",
  "id",
  "content",
  "packageId",
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];

export const FORMAT_NAMES = [] as const;
export type FormatName = (typeof FORMAT_NAMES)[number];
