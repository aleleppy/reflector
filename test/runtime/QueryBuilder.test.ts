import "./_setup-runes";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { pageMock, gotoMock } = vi.hoisted(() => ({
  pageMock: { url: new URL("http://localhost/") } as { url: URL },
  gotoMock: vi.fn(),
}));

vi.mock("$app/state", () => ({ page: pageMock }));
vi.mock("$app/navigation", () => ({ goto: gotoMock }));
vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("$lib/utils/toast.svelte", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("svelte/reactivity", () => ({ SvelteURL: URL }));
vi.mock("svelte", () => ({ untrack: (fn: () => void) => fn() }));

import {
  QueryBuilder,
  EnumQueryBuilder,
  setQueryGroup,
} from "../../src/runtime/reflector.svelte.js";

beforeEach(async () => {
  // Drena qualquer flush (microtask) vazado de um teste anterior antes de
  // resetar os mocks — `pendingUrl` é estado de módulo, então um teste que
  // não aguardou o flush deixaria a URL pendente sangrar pro próximo.
  await Promise.resolve();
  pageMock.url = new URL("http://localhost/");
  gotoMock.mockReset();
});

describe("QueryBuilder", () => {
  it("reads value from current URL on every access", () => {
    const qb = new QueryBuilder({ key: "page" });
    expect(qb.value).toBeNull();

    pageMock.url = new URL("http://localhost/?page=3");
    expect(qb.value).toBe("3");

    pageMock.url = new URL("http://localhost/?page=7");
    expect(qb.value).toBe("7");
  });

  it("two instances of the same key always agree", () => {
    const a = new QueryBuilder({ key: "limit" });
    const b = new QueryBuilder({ key: "limit" });

    pageMock.url = new URL("http://localhost/?limit=25");
    expect(a.value).toBe("25");
    expect(b.value).toBe("25");

    pageMock.url = new URL("http://localhost/?limit=50");
    expect(a.value).toBe("50");
    expect(b.value).toBe("50");
  });

  it("falls back to defaultValue when URL has no param", () => {
    const qb = new QueryBuilder({ key: "limit", defaultValue: "10" });
    expect(qb.value).toBe("10");
  });

  it("URL value wins over defaultValue", () => {
    const qb = new QueryBuilder({ key: "limit", defaultValue: "10" });
    pageMock.url = new URL("http://localhost/?limit=99");
    expect(qb.value).toBe("99");
  });

  it("coerces numeric defaultValue to string", () => {
    const qb = new QueryBuilder({ key: "limit", defaultValue: 42 });
    expect(qb.value).toBe("42");
  });

  it("treats defaultValue: null/undefined as no default", () => {
    const a = new QueryBuilder({ key: "x", defaultValue: null });
    const b = new QueryBuilder({ key: "x", defaultValue: undefined });
    const c = new QueryBuilder({ key: "x" });
    expect(a.value).toBeNull();
    expect(b.value).toBeNull();
    expect(c.value).toBeNull();
  });

  it("update(null) and update(undefined) are no-ops", () => {
    const qb = new QueryBuilder({ key: "page" });
    qb.update(null);
    qb.update(undefined as unknown as null);
    expect(gotoMock).not.toHaveBeenCalled();
  });

  it("update(value) calls goto with URL containing the new param", async () => {
    const qb = new QueryBuilder({ key: "page" });
    qb.update("2");
    // O goto agora é diferido pra microtask — drena antes de assertar.
    await Promise.resolve();
    expect(gotoMock).toHaveBeenCalledTimes(1);
    const [target] = gotoMock.mock.calls[0]!;
    expect((target as URL).searchParams.get("page")).toBe("2");
  });

  it("update coerces numbers to string", async () => {
    const qb = new QueryBuilder({ key: "page" });
    qb.update(5);
    await Promise.resolve();
    const [target] = gotoMock.mock.calls[0]!;
    expect((target as URL).searchParams.get("page")).toBe("5");
  });

  it("read-after-write: value reflects the pending param before navigation", async () => {
    const qb = new QueryBuilder({ key: "page" });
    qb.update("2");
    // Antes do flush: value lê de `pendingUrl`, então enxerga o valor recém-setado.
    expect(qb.value).toBe("2");
    // Após o flush, o goto (mock) não muta `pageMock.url`, então `pendingUrl`
    // volta a null e value cai pro page.url (sem o param).
    await Promise.resolve();
    expect(qb.value).toBeNull();
  });

  it("coalesces two updates in the same tick into a single goto with both params", async () => {
    const status = new QueryBuilder({ key: "status" });
    const page = new QueryBuilder({ key: "page" });
    status.update("paid");
    page.update("1");
    // Sem batching, o segundo update partiria de page.url (sem status) e o
    // clobbaria. Com o acumulador, um único goto carrega os dois.
    await Promise.resolve();
    expect(gotoMock).toHaveBeenCalledTimes(1);
    const [target] = gotoMock.mock.calls[0]!;
    const url = target as URL;
    expect(url.searchParams.get("status")).toBe("paid");
    expect(url.searchParams.get("page")).toBe("1");
  });
});

describe("setQueryGroup", () => {
  it("updates URL with all params from the group", async () => {
    setQueryGroup([
      { key: "page", value: "1" },
      { key: "limit", value: 20 },
    ]);

    await Promise.resolve();
    expect(gotoMock).toHaveBeenCalledTimes(1);
    const [target] = gotoMock.mock.calls[0]!;
    const url = target as URL;
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("20");
  });

  it("preserves params outside the group", async () => {
    pageMock.url = new URL("http://localhost/?other=keep&page=old");
    setQueryGroup([{ key: "page", value: "new" }]);

    await Promise.resolve();
    const [target] = gotoMock.mock.calls[0]!;
    const url = target as URL;
    expect(url.searchParams.get("other")).toBe("keep");
    expect(url.searchParams.get("page")).toBe("new");
  });

  it("appends array values as repeated params", async () => {
    setQueryGroup([{ key: "tag", value: ["a", "b", "c"] }]);

    await Promise.resolve();
    const [target] = gotoMock.mock.calls[0]!;
    const url = target as URL;
    expect(url.searchParams.getAll("tag")).toEqual(["a", "b", "c"]);
  });

  it("two preexisting QueryBuilder instances reflect URL after setQueryGroup", async () => {
    const page = new QueryBuilder({ key: "page" });
    const limit = new QueryBuilder({ key: "limit" });

    // setQueryGroup only calls goto; in real SvelteKit, goto updates page.url.
    // We simulate that by mutating pageMock.url after the (deferred) flush.
    setQueryGroup([
      { key: "page", value: "1" },
      { key: "limit", value: "20" },
    ]);
    await Promise.resolve();
    pageMock.url = (gotoMock.mock.calls[0]![0] as URL);

    expect(page.value).toBe("1");
    expect(limit.value).toBe("20");
  });
});

describe("EnumQueryBuilder", () => {
  it("instantiates with defaultValues and exposes the key", () => {
    const eqb = new EnumQueryBuilder<string>({
      key: "tags",
      defaultValues: ["a", "b"],
    });
    expect(eqb.key).toBe("tags");
  });

  it("instantiates without defaultValues", () => {
    const eqb = new EnumQueryBuilder<string>({ key: "tags" });
    expect(eqb.key).toBe("tags");
  });

  // Note: EnumQueryBuilder.values uses $derived internally. Under the rune
  // stub it is evaluated once at field-init time, which means we can't
  // assert reactive behaviour here. Reactivity is verified at consumer
  // integration; this test only locks the constructor surface.
});
