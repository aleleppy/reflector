export const FIELD_NAMES = ["success", "message", "id", "label"] as const;
export type FieldName = (typeof FIELD_NAMES)[number];
