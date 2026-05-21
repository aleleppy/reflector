export const FIELD_NAMES = [
  "id",
  "mes",
  "calendario",
  "empresa",
  "refItems",
  "tags",
  "dia",
  "tipo",
  "dataIso",
  "cnpj",
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];
