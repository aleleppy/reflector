import "./_setup-runes";
import { describe, it, expect, vi } from "vitest";

// Mesmos mocks de módulo do BuildedInput.test.ts — importar o runtime puxa os
// imports do SvelteKit mesmo quando o alvo do teste é só serialização.
vi.mock("$app/state", () => ({ page: { url: new URL("http://localhost/") } }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("$lib/utils/toast.svelte", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("svelte/reactivity", () => ({ SvelteURL: URL }));
vi.mock("svelte", () => ({ untrack: (fn: () => void) => fn() }));

import { BuildedInput, bundleInputs } from "../../src/runtime/reflector.svelte.js";

const input = (value = "", opts: { required?: boolean; nullable?: boolean } = {}) => {
  const built = new BuildedInput<string>({
    example: "",
    placeholder: "",
    required: opts.required ?? false,
    nullable: opts.nullable ?? false,
  });
  built.value = value;
  return built;
};

/** Espelha o shape que o codegen emite para um sub-DTO: campos `BuildedInput`
 *  + um `bundle()` que delega pro `bundleInputs`. */
class SubDto {
  name = input();
  email = input();

  constructor(values: { name?: string; email?: string } = {}) {
    if (values.name !== undefined) this.name.value = values.name;
    if (values.email !== undefined) this.email.value = values.email;
  }

  bundle() {
    return bundleInputs({ name: this.name, email: this.email });
  }
}

describe("bundleInputs — gate de sub-DTO opcional (_optionalDtos)", () => {
  it("omite o sub-DTO opcional quando ele está inteiro em branco", () => {
    const out = bundleInputs(
      { id: input("1"), responsible: new SubDto() },
      new Set(["responsible"]),
    );

    expect(out).toEqual({ id: "1" });
    expect("responsible" in out).toBe(false);
  });

  it("mantém o sub-DTO opcional quando qualquer campo dele foi preenchido", () => {
    const out = bundleInputs(
      { id: input("1"), responsible: new SubDto({ name: "Ana" }) },
      new Set(["responsible"]),
    );

    expect(out).toEqual({ id: "1", responsible: { name: "Ana", email: "" } });
  });

  it("mantém o sub-DTO vazio que NÃO está no set (comportamento default preservado)", () => {
    const out = bundleInputs({ id: input("1"), responsible: new SubDto() }, new Set(["outro"]));

    expect(out).toEqual({ id: "1", responsible: { name: "", email: "" } });
  });

  it("sem o 2º argumento serializa tudo, como antes", () => {
    const out = bundleInputs({ id: input("1"), responsible: new SubDto() });

    expect(out).toEqual({ id: "1", responsible: { name: "", email: "" } });
  });

  it("não confunde sub-DTO nullable (null é intencional) com bloco vazio", () => {
    const out = bundleInputs({ id: input("1"), responsible: null }, new Set(["responsible"]));

    expect(out).toEqual({ id: "1", responsible: null });
  });

  it("não mexe em campo primitivo vazio de nível raiz", () => {
    const out = bundleInputs({ id: input(""), name: input("") }, new Set(["id"]));

    expect(out).toEqual({ id: "", name: "" });
  });

  it("considera preenchido o bloco opcional cujo sub-bloco aninhado tem valor", () => {
    class Wrapper {
      inner = new SubDto({ email: "a@b.c" });
      bundle() {
        return bundleInputs({ inner: this.inner });
      }
    }

    const out = bundleInputs({ outer: new Wrapper() }, new Set(["outer"]));

    expect(out).toEqual({ outer: { inner: { name: "", email: "a@b.c" } } });
  });

  it("omite o bloco opcional cujo sub-bloco aninhado também está vazio", () => {
    class Wrapper {
      inner = new SubDto();
      bundle() {
        return bundleInputs({ inner: this.inner });
      }
    }

    const out = bundleInputs({ id: input("1"), outer: new Wrapper() }, new Set(["outer"]));

    expect(out).toEqual({ id: "1" });
  });
});
