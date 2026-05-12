export const FIELD_NAMES = ["id", "name", "success", "message"] as const;
export type FieldName = (typeof FIELD_NAMES)[number];
