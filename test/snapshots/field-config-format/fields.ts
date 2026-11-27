export const FIELD_NAMES = ["email", "password", "inviteId"] as const;
export type FieldName = (typeof FIELD_NAMES)[number];

export const FORMAT_NAMES = ["email", "strong-password", "uuid"] as const;
export type FormatName = (typeof FORMAT_NAMES)[number];
