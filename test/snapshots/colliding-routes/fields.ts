export const FIELD_NAMES = ["success", "message", "id", "name"] as const;
export type FieldName = (typeof FIELD_NAMES)[number];
