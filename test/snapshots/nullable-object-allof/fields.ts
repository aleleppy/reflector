export const FIELD_NAMES = [
  "name",
  "email",
  "document",
  "login",
  "address",
  "code",
  "id",
  "responsible",
  "owner",
  "manager",
  "shipping",
  "coupon",
  "meta",
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];
