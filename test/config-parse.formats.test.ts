import { describe, it, expect } from "vitest";
import { parseFieldConfigsFromConfig } from "../src/helpers/generate-doc.helper.js";
import { createFieldConfigs, resolveFieldConfig } from "../src/core/config/FieldConfigs.js";

describe("parseFieldConfigsFromConfig — formats matcher", () => {
  it("captures a formats entry with its payload", () => {
    const code = `
      export const fieldConfigs: ReflectorFieldsConfig[] = [
        { fields: ['password'], validator: validateInputs.minLength },
        { formats: ['strong-password'], validator: validateInputs.strongPassword },
      ];
    `;
    expect(parseFieldConfigsFromConfig(code)).toEqual([
      { matcher: "fields", names: ["password"], config: { validator: "validateInputs.minLength" } },
      { matcher: "formats", names: ["strong-password"], config: { validator: "validateInputs.strongPassword" } },
    ]);
  });

  it("rejects an entry declaring both fields and formats", () => {
    const code = `
      export const fieldConfigs = [
        { fields: ['password'], formats: ['strong-password'], validator: validateInputs.strongPassword },
      ];
    `;
    expect(() => parseFieldConfigsFromConfig(code)).toThrow(/either 'fields' or 'formats', not both/);
  });

  it("skips entries with neither matcher or an empty list", () => {
    const code = `
      export const fieldConfigs = [
        { validator: validateInputs.email },
        { formats: [], validator: validateInputs.email },
      ];
    `;
    expect(parseFieldConfigsFromConfig(code)).toEqual([]);
  });
});

describe("resolveFieldConfig", () => {
  const configs = createFieldConfigs([
    { matcher: "fields", names: ["password"], config: { validator: "validateInputs.minLength" } },
    { matcher: "formats", names: ["strong-password"], config: { validator: "validateInputs.strongPassword" } },
  ]);

  it("format match wins over field-name match, without merging", () => {
    expect(resolveFieldConfig(configs, { name: "password", format: "strong-password" })).toEqual({
      validator: "validateInputs.strongPassword",
    });
  });

  it("falls back to the field name when the format has no entry", () => {
    expect(resolveFieldConfig(configs, { name: "password", format: "email" })).toEqual({ validator: "validateInputs.minLength" });
    expect(resolveFieldConfig(configs, { name: "password", format: undefined })).toEqual({ validator: "validateInputs.minLength" });
  });

  it("never matches a format entry by name", () => {
    expect(resolveFieldConfig(configs, { name: "strong-password", format: undefined })).toBeUndefined();
  });
});
