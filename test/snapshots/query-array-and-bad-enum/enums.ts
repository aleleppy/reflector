export const ENUM_ITEM_ENTITY_STATUSES = ["active", "inactive"] as const;
export type ENUM_ITEM_ENTITY_STATUSES =
  (typeof ENUM_ITEM_ENTITY_STATUSES)[number];
