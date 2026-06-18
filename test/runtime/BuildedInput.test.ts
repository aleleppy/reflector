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
// `untrack` só precisa rodar o callback — sem reatividade real no node env.
vi.mock("svelte", () => ({ untrack: (fn: () => void) => fn() }));

import { BuildedInput, validateForm, untouchForm, type Sanitizer } from "../../src/runtime/reflector.svelte.js";

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

describe("BuildedInput — hydrate (in-place, sanitizer-aware)", () => {
  it("sem sanitizer: hydrate seta value e display ao valor cru", () => {
    const input = makeInput("inicial");
    input.hydrate("novo");
    expect(input.value).toBe("novo");
    expect(input.display).toBe("novo");
  });

  it("com sanitizer: hydrate formata display e value deriva (cru)", () => {
    const input = makeSanitized();
    input.hydrate("11999998888");
    expect(input.display).toBe("(11) 99999-8888");
    expect(input.value).toBe("11999998888");
  });

  it("com sanitizer + nullable: hydrate(null) limpa display e value vira null", () => {
    const input = makeSanitized({ nullable: true });
    input.hydrate("11999998888");
    expect(input.display).toBe("(11) 99999-8888");
    input.hydrate(null as unknown as string);
    expect(input.display).toBe("");
    expect(input.value).toBeNull();
  });

  it("limpa o server error ao hidratar", () => {
    const input = makeInput("a");
    input.setServerError("invalid");
    expect(input.serverError).toBe("invalid");
    input.hydrate("a");
    expect(input.serverError).toBeNull();
  });
});

describe("BuildedInput — showError / touch", () => {
  it("showError starts false", () => {
    expect(makeInput("a").showError).toBe(false);
  });

  it("touch() flips showError to true, untouch() back to false", () => {
    const input = makeInput("a");
    input.touch();
    expect(input.showError).toBe(true);
    input.untouch();
    expect(input.showError).toBe(false);
  });
});

describe("validateForm — gate honesto", () => {
  const required = (value = "", validator?: (v: string) => string | null) =>
    new BuildedInput<string>({ example: value, required: true, placeholder: "", validator });

  it("returns false without throwing on an invalid form", () => {
    const schema = { name: required("") };
    let result: boolean | undefined;
    expect(() => {
      result = validateForm(schema);
    }).not.toThrow();
    expect(result).toBe(false);
  });

  it("returns true for a fully valid form", () => {
    const schema = { name: required("ok"), age: required("ok") };
    expect(validateForm(schema)).toBe(true);
  });

  it("touches EVERY field, not just the first invalid one", () => {
    const a = required("");
    const b = required("");
    const c = required("");
    validateForm({ a, b, c });
    expect(a.showError).toBe(true);
    expect(b.showError).toBe(true);
    expect(c.showError).toBe(true);
  });

  it("required-empty WITHOUT a validator is invalid (the isFormValid hole)", () => {
    const schema = { name: required("") }; // required, sem validator
    expect(validateForm(schema)).toBe(false);
  });

  it("required-empty WITH a passing validator is still invalid (empty wins)", () => {
    const schema = { name: required("", () => null) };
    expect(validateForm(schema)).toBe(false);
  });

  it("consults the validator for non-empty values", () => {
    const tooShort = required("ab", (v) => (v.length >= 3 ? null : "curto"));
    expect(validateForm({ tooShort })).toBe(false);
    const longEnough = required("abc", (v) => (v.length >= 3 ? null : "curto"));
    expect(validateForm({ longEnough })).toBe(true);
  });

  it("ignores non-BuildedInput entries and does NOT mutate the schema", () => {
    const bundle = () => ({});
    const schema = { name: required("ok"), bundle };
    expect(validateForm(schema)).toBe(true);
    expect(schema.bundle).toBe(bundle); // diferente do isFormValid, que dá delete
  });

  // sub-DTO: objeto com `.bundle()` e seus próprios BuildedInput (isNestedDto → recursa).
  const dto = (fields: Record<string, unknown>) => ({ ...fields, bundle: () => ({}) });

  it("recurses into a nested DTO (sub-form) and touches its inner fields", () => {
    const inner = required("");
    const schema = { nome: required("ok"), endereco: dto({ rua: inner }) };
    expect(validateForm(schema)).toBe(false);
    expect(inner.showError).toBe(true); // o filho foi tocado, não só o raiz
  });

  it("recurses into arrays of DTOs", () => {
    const bad = required("");
    const schema = { itens: [dto({ nome: required("ok") }), dto({ nome: bad })] };
    expect(validateForm(schema)).toBe(false);
    expect(bad.showError).toBe(true);
  });

  it("a valid nested DTO does not flip the form invalid", () => {
    const schema = { nome: required("ok"), endereco: dto({ rua: required("rua x") }) };
    expect(validateForm(schema)).toBe(true);
  });

  // _optionalDtos = sub-DTOs opcionais always-instantiated emitidos pelo codegen.
  it("SKIPS an optional sub-DTO that is entirely empty (no false block)", () => {
    const card = required("");
    const schema = {
      nome: required("ok"),
      billing: dto({ card }),
      _optionalDtos: new Set(["billing"]),
    };
    expect(validateForm(schema)).toBe(true); // bloco opcional em branco passa
    expect(card.showError).toBe(false); // e não acende erro no campo interno
  });

  it("VALIDATES an optional sub-DTO once the user started filling it", () => {
    const card = required("1234");
    const holder = required(""); // required interno ainda vazio
    const schema = {
      nome: required("ok"),
      billing: dto({ card, holder }),
      _optionalDtos: new Set(["billing"]),
    };
    expect(validateForm(schema)).toBe(false); // começou a preencher → required interno conta
    expect(holder.showError).toBe(true);
  });

  it("a REQUIRED sub-DTO (not in _optionalDtos) empty still fails", () => {
    const card = required("");
    const schema = {
      nome: required("ok"),
      shipping: dto({ card }), // sem _optionalDtos → obrigatório
    };
    expect(validateForm(schema)).toBe(false);
    expect(card.showError).toBe(true);
  });

  // Caso real: o `form` do adapter é INSTÂNCIA de classe DTO (campos no objeto,
  // `bundle` no protótipo) — não objeto literal. Instância de classe não é
  // atribuível a `Record<string, unknown>` (falta index signature), então a
  // assinatura `object` é o que permite `validateForm(this.form)` sem cast.
  it("aceita instância de classe (form de adapter), não só objeto literal", () => {
    class FakeForm {
      name = required("");
      bundle() {
        return {};
      }
    }
    const form = new FakeForm();
    // compila sem cast — era o erro de svelte-check que o `Record` causava
    expect(validateForm(form)).toBe(false); // name required vazio
    expect(form.name.showError).toBe(true);
  });
});

describe("untouchForm — simétrico do validateForm", () => {
  const required = (value = "") =>
    new BuildedInput<string>({ example: value, required: true, placeholder: "" });
  const dto = (fields: Record<string, unknown>) => ({ ...fields, bundle: () => ({}) });

  it("clears showError on every field, including nested ones", () => {
    const a = required("");
    const b = required("");
    const schema = { a, nested: dto({ b }) };

    validateForm(schema); // acende tudo
    expect(a.showError).toBe(true);
    expect(b.showError).toBe(true);

    untouchForm(schema); // apaga tudo
    expect(a.showError).toBe(false);
    expect(b.showError).toBe(false);
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
