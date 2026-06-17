import { describe, it, expect } from "vitest";
import { PrimitiveProp } from "../src/props/primitive.property.js";
import type { SchemaObject } from "../src/types/open-api-spec.interface.js";

const make = (type: string, extra: { validator?: string; sanitizer?: string } = {}) =>
  new PrimitiveProp({
    name: "phone",
    schemaObject: { type } as SchemaObject,
    required: false,
    validator: extra.validator,
    sanitizer: extra.sanitizer,
    isParam: undefined,
  });

describe("PrimitiveProp — sanitizer emission (raw, pre-prettier)", () => {
  it("emits sanitizer: <ref> for a string field", () => {
    const out = make("string", { sanitizer: "sanitizers.phone" }).constructorBuild();
    expect(out).toContain("sanitizer: sanitizers.phone");
  });

  it("emits validator and sanitizer together, comma-separated (no broken comma)", () => {
    const out = make("string", {
      validator: "validateInputs.phone",
      sanitizer: "sanitizers.phone",
    }).constructorBuild();
    expect(out).toMatch(/validator: validateInputs\.phone, sanitizer: sanitizers\.phone/);
    expect(out).not.toMatch(/,\s*,/); // sem vírgula dupla
  });

  it("does NOT emit sanitizer on a non-string field", () => {
    const out = make("number", { sanitizer: "sanitizers.phone" }).constructorBuild();
    expect(out).not.toContain("sanitizer");
  });

  it("omits sanitizer when none configured (diffless)", () => {
    const out = make("string").constructorBuild();
    expect(out).not.toContain("sanitizer");
  });
});
