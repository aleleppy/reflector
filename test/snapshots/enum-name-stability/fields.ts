export const FIELD_NAMES = ["state", "states", "kind"] as const;
export type FieldName = (typeof FIELD_NAMES)[number];
