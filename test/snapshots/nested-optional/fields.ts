export const FIELD_NAMES = [
  "success",
  "address",
  "cardNumber",
  "holder",
  "code",
  "createdBy",
  "id",
  "name",
  "shipping",
  "billing",
  "coupon",
  "audit",
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];

export const FORMAT_NAMES = [] as const;
export type FormatName = (typeof FORMAT_NAMES)[number];
