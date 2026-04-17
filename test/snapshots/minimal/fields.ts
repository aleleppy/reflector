export const FIELD_NAMES = [
  "street",
  "city",
  "id",
  "name",
  "email",
  "status",
  "tags",
  "roles",
  "address",
  "success",
  "message",
  "role",
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];
