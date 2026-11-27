export const FIELD_NAMES = [
  "street",
  "city",
  "id",
  "name",
  "email",
  "status",
  "tags",
  "roles",
  "priority",
  "address",
  "success",
  "message",
  "userId",
  "productId",
  "quantity",
  "title",
  "action",
  "actionMeta",
  "role",
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];

export const FORMAT_NAMES = [] as const;
export type FormatName = (typeof FORMAT_NAMES)[number];
