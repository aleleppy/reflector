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

import { BuildedInput } from "../../src/runtime/reflector.svelte.js";

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
