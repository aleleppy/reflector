export const FIELD_NAMES = [
  "success",
  "message",
  "data",
  "favoriteProducts",
  "paymentMethods",
  "id",
  "name",
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];
