import "./_setup-runes";
import { describe, it, expect, vi } from "vitest";

// BuildedInput only touches the rune stubs (value/display/serverError* are
// $state), but importing the runtime module still pulls its SvelteKit imports,
// so the same module mocks as QueryBuilder.test.ts are required.
vi.mock("$app/state", () => ({ page: { url: new URL("http://localhost/") } }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("$lib/utils/toast.svelte", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("svelte/reactivity", () => ({ SvelteURL: URL }));

import { BuildedInput, type Sanitizer } from "../../src/runtime/reflector.svelte.js";

const makeInput = (value = "") =>
  new BuildedInput<string>({ example: value, required: false, placeholder: "" });

// Under the rune stub there is no signal reactivity — the getter is exercised
// as plain value logic. The Svelte re-derivation nuance ($state.raw forcing a
// re-run on re-submit) is verified at consumer integration; this suite locks
// the snapshot-vs-value semantics of `serverError`.
describe("BuildedInput — server-side validation error", () => {
  it("serverError is null before any error is set", () => {
    expect(makeInput("a").serverError).toBeNull();
  });

  it("exposes the message after setServerError while value is unchanged", () => {
    const input = makeInput("a");
    input.setServerError("deve ser um e-mail");
    expect(input.serverError).toBe("deve ser um e-mail");
  });

  it("clears itself when value changes away from the captured snapshot", () => {
    const input = makeInput("a");
    input.setServerError("invalid");
    expect(input.serverError).toBe("invalid");

    input.value = "ab"; // user edits the field
    expect(input.serverError).toBeNull();
  });

  it("reappears when value returns to the captured snapshot (=== semantics)", () => {
    const input = makeInput("a");
    input.setServerError("invalid");

    input.value = "b";
    expect(input.serverError).toBeNull();

    input.value = "a"; // back to the value that errored
    expect(input.serverError).toBe("invalid");
  });

  it("re-setting after an edit captures the new value and shows again", () => {
    const input = makeInput("a");
    input.setServerError("invalid");

    input.value = "b";
    expect(input.serverError).toBeNull();

    // server rejects the edited value with the same message
    input.setServerError("invalid");
    expect(input.serverError).toBe("invalid");
  });

  it("clearServerError removes the message", () => {
    const input = makeInput("a");
    input.setServerError("invalid");
    expect(input.serverError).toBe("invalid");

    input.clearServerError();
    expect(input.serverError).toBeNull();
  });
});

// phone-like máscara: parse = só dígitos (canônico); format = (XX) XXXXX-XXXX.
const phone: Sanitizer = {
  parse: (d) => d.replace(/\D/g, ""),
  format: (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  },
};

const makeSanitized = (opts: { nullable?: boolean; key?: string } = {}) =>
  new BuildedInput<string>({
    example: "",
    required: false,
    placeholder: "",
    sanitizer: phone,
    ...opts,
  });

describe("BuildedInput — sanitizer (display é a fonte; value deriva)", () => {
  it("value derives from display via parse", () => {
    const input = makeSanitized();
    input.display = "(11) 99999-8888";
    expect(input.value).toBe("11999998888");
  });

  it("set value formats display via format (round-trip)", () => {
    const input = makeSanitized();
    input.value = "11999998888";
    expect(input.display).toBe("(11) 99999-8888");
    expect(input.value).toBe("11999998888");
  });

  it("reformat() reapplies the mask to a raw display", () => {
    const input = makeSanitized();
    input.display = "11999998888"; // cru, sem máscara
    input.reformat();
    expect(input.display).toBe("(11) 99999-8888");
  });

  it("nullable + empty display yields null value", () => {
    const input = makeSanitized({ nullable: true });
    input.display = "";
    expect(input.value).toBeNull();
  });

  it("non-nullable + empty display yields empty string (not null)", () => {
    const input = makeSanitized();
    input.display = "";
    expect(input.value).toBe("");
  });

  it("construction via key starts display formatted", () => {
    const input = makeSanitized({ key: "11999998888" });
    expect(input.display).toBe("(11) 99999-8888");
    expect(input.value).toBe("11999998888");
  });

  it("setting value to null clears display", () => {
    const input = makeSanitized({ nullable: true });
    input.value = "11999998888";
    expect(input.display).toBe("(11) 99999-8888");
    input.value = null as unknown as string;
    expect(input.display).toBe("");
    expect(input.value).toBeNull();
  });

  it("validate() reads the parsed canonical value, not the masked display", () => {
    const input = new BuildedInput<string>({
      example: "",
      required: false,
      placeholder: "",
      sanitizer: phone,
      validator: (v) => (v.length === 11 ? null : "telefone inválido"),
    });
    input.display = "(11) 99999-8888";
    expect(input.validate()).toBeNull();
    input.display = "(11) 9";
    expect(input.validate()).toBe("telefone inválido");
  });
});

describe("BuildedInput — sem sanitizer (back-compat byte-a-byte)", () => {
  it("value and display are independent and writable", () => {
    const input = makeInput("");
    input.value = "canonical";
    input.display = "shown";
    // setter sem sanitizer não toca display; e escrever display não muda value
    expect(input.value).toBe("canonical");
    expect(input.display).toBe("shown");
  });

  it("value/display both initialize from key (or example)", () => {
    const fromKey = new BuildedInput<string>({ key: "x", example: "y", required: false, placeholder: "" });
    expect(fromKey.value).toBe("x");
    expect(fromKey.display).toBe("x");

    const fromExample = new BuildedInput<string>({ example: "y", required: false, placeholder: "" });
    expect(fromExample.value).toBe("y");
    expect(fromExample.display).toBe("y");
  });
});
