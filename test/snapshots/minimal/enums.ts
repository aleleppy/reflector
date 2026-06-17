export const ENUM_USER_ENTITY_ROLES = ["admin", "user"] as const;
export type ENUM_USER_ENTITY_ROLES = (typeof ENUM_USER_ENTITY_ROLES)[number];
export const ENUM_USER_ENTITY_PRIORITY = ["low", "high"] as const;
export type ENUM_USER_ENTITY_PRIORITY =
  (typeof ENUM_USER_ENTITY_PRIORITY)[number];
export const ENUM_NOTIFICATION_ENTITY_ACTION = [
  "USER_CREATED",
  "USER_UPDATED",
  "STOCK_LOW",
  "STOCK_OUT",
] as const;
export type ENUM_NOTIFICATION_ENTITY_ACTION =
  (typeof ENUM_NOTIFICATION_ENTITY_ACTION)[number];
