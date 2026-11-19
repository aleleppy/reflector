export const ENUM_REPORT_SUMMARY_ITEM_KIND = [
  "text",
  "integer",
  "currency",
] as const;
export type ENUM_REPORT_SUMMARY_ITEM_KIND =
  (typeof ENUM_REPORT_SUMMARY_ITEM_KIND)[number];
export const ENUM_REPORT_SUMMARY_ITEM_UNIT = ["BRL", "USD"] as const;
export type ENUM_REPORT_SUMMARY_ITEM_UNIT =
  (typeof ENUM_REPORT_SUMMARY_ITEM_UNIT)[number];
