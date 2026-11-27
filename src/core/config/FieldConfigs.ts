import type { FieldConfig, FieldConfigs, ParsedFieldConfig } from "../../types/types.js";

export function createFieldConfigs(entries: readonly ParsedFieldConfig[]): FieldConfigs {
  const byField = new Map<string, FieldConfig>();
  const byFormat = new Map<string, FieldConfig>();

  for (const entry of entries) {
    const target = selectTarget(entry.matcher, byField, byFormat);
    for (const name of entry.names) target.set(name, entry.config);
  }

  return { byField, byFormat };
}

function selectTarget(
  matcher: ParsedFieldConfig["matcher"],
  byField: Map<string, FieldConfig>,
  byFormat: Map<string, FieldConfig>,
): Map<string, FieldConfig> {
  switch (matcher) {
    case "fields":
      return byField;
    case "formats":
      return byFormat;
  }
}

/**
 * The contract (`format`) is more specific than the property name, so a
 * format match wins outright; the name lookup is only the fallback.
 */
export function resolveFieldConfig(
  configs: FieldConfigs,
  property: { name: string; format: string | undefined },
): FieldConfig | undefined {
  if (property.format !== undefined) {
    const byFormat = configs.byFormat.get(property.format);
    if (byFormat) return byFormat;
  }
  return configs.byField.get(property.name);
}
