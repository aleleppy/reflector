export const ENUM_USER_ENTITY_ROLES = ["admin", "user"] as const;
export type ENUM_USER_ENTITY_ROLES = (typeof ENUM_USER_ENTITY_ROLES)[number];
export const ENUM_USER_ENTITY_PRIORITY = ["low", "high"] as const;
export type ENUM_USER_ENTITY_PRIORITY =
  (typeof ENUM_USER_ENTITY_PRIORITY)[number];
