import { describe, it, expect } from "vitest";
import { parseFieldConfigsFromConfig } from "../src/helpers/generate-doc.helper.js";

describe("parseFieldConfigsFromConfig — sanitizer capture", () => {
  it("captures the textual sanitizer ref", () => {
    const code = `
      export const fieldConfigs = [
        { fields: ["phone"], sanitizer: sanitizers.phone },
      ];
    `;
    expect(parseFieldConfigsFromConfig(code)).toEqual([
      { matcher: "fields", names: ["phone"], config: { sanitizer: "sanitizers.phone" } },
    ]);
  });

  it("captures validator + sanitizer + type together", () => {
    const code = `
      export const fieldConfigs = [
        { fields: ["email", "userEmail"], validator: validateInputs.email, sanitizer: sanitizers.email, type: 'CustomType' },
      ];
    `;
    expect(parseFieldConfigsFromConfig(code)).toEqual([
      {
        matcher: "fields",
        names: ["email", "userEmail"],
        config: { validator: "validateInputs.email", sanitizer: "sanitizers.email", type: "CustomType" },
      },
    ]);
  });

  it("leaves sanitizer undefined when absent (back-compat)", () => {
    const code = `
      export const fieldConfigs = [
        { fields: ["name"], validator: validateInputs.emptyString },
      ];
    `;
    expect(parseFieldConfigsFromConfig(code)).toEqual([
      { matcher: "fields", names: ["name"], config: { validator: "validateInputs.emptyString" } },
    ]);
  });
});
