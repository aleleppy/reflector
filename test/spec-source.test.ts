import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { reflector } from "../src/generate-doc.js";
import { parseCliArgs, runCli, CliUsageError } from "../src/helpers/cli.js";
import { SpecSourceError } from "../src/loaders/SpecSource.js";
import { deadUrl, readFixture, serve, snapshotTree, useTempProject } from "./helpers/temp-project.js";

const MODULE = "src/reflector/controllers/user/user.module.svelte.ts";
const BACKUP = "src/reflector/backup.json";

let project: ReturnType<typeof useTempProject>;

beforeEach(() => {
  project = useTempProject();
});

afterEach(() => {
  project.restore();
});

const withSource = (source: unknown) => project.write("reflector.json", JSON.stringify({ source }));

describe("source.file", () => {
  it("generates from the contract without BACKEND_URL and never writes backup.json", async () => {
    project.write("contract/openapi.json", readFixture("minimal"));
    withSource({ file: "contract/openapi.json" });

    await reflector(true);

    expect(project.exists(MODULE)).toBe(true);
    expect(project.exists(BACKUP)).toBe(false);
    expect(project.warn.mock.calls.flat().join("\n")).not.toMatch(/DEPRECATED/);
  });

  it("fails on a missing file instead of falling back to backup.json", async () => {
    project.write(BACKUP, readFixture("minimal"));
    withSource({ file: "contract/openapi.json" });

    await expect(reflector(true)).rejects.toThrow(SpecSourceError);
    await expect(reflector(true)).rejects.toThrow(/arquivo não encontrado/);
    expect(project.exists(MODULE)).toBe(false);
  });

  it("fails on invalid JSON and leaves the previous output and backup untouched", async () => {
    project.write("contract/openapi.json", readFixture("minimal"));
    withSource({ file: "contract/openapi.json" });
    await reflector(true);
    project.write(BACKUP, "{}");
    const before = snapshotTree(project.file("src/reflector"));

    project.write("contract/openapi.json", '{ "openapi": "3.0.0", ');

    await expect(reflector(true)).rejects.toThrow(/JSON inválido/);
    expect(snapshotTree(project.file("src/reflector"))).toEqual(before);
  });

  it.each([
    ["Swagger 2.0", { swagger: "2.0", paths: {}, definitions: {} }, /esperado OpenAPI 3\.x, encontrado swagger 2\.0/],
    ["non-object", [1, 2], /não é um objeto/],
    ["no paths", { openapi: "3.0.0", components: {} }, /"paths"/],
    ["no components", { openapi: "3.1.0", paths: {} }, /"components"/],
  ])("rejects a non-OpenAPI-3 document (%s)", async (_label, doc, message) => {
    project.write("contract/openapi.json", JSON.stringify(doc));
    withSource({ file: "contract/openapi.json" });

    await expect(reflector(true)).rejects.toThrow(message);
    expect(project.exists(BACKUP)).toBe(false);
  });
});

describe("source.url", () => {
  it("fails immediately when the server is down, even with a backup.json on disk", async () => {
    const backup = readFixture("minimal");
    project.write(BACKUP, backup);
    withSource({ url: `${await deadUrl()}openapi.json` });

    await expect(reflector(true)).rejects.toThrow(/Falha ao baixar o contrato OpenAPI/);
    expect(project.exists(MODULE)).toBe(false);
    expect(snapshotTree(project.file("src/reflector"))).toEqual({ "backup.json": backup });
  });

  it("fails on an HTTP error status", async () => {
    const server = await serve(500, "{}");
    try {
      withSource({ url: server.url });
      await expect(reflector(true)).rejects.toThrow(/HTTP 500/);
    } finally {
      await server.close();
    }
  });

  it("generates from the URL without writing backup.json", async () => {
    const server = await serve(200, readFixture("minimal"));
    try {
      withSource({ url: server.url });
      await reflector(true);
      expect(server.hits()).toBe(1);
      expect(project.exists(MODULE)).toBe(true);
      expect(project.exists(BACKUP)).toBe(false);
    } finally {
      await server.close();
    }
  });
});

describe("reflector.json source validation", () => {
  it.each([
    ["string", "contract/openapi.json"],
    ["both keys", { file: "a.json", url: "http://x" }],
    ["unknown key", { path: "a.json" }],
    ["empty value", { file: "  " }],
  ])("rejects an invalid source (%s)", async (_label, source) => {
    withSource(source);
    await expect(reflector(true)).rejects.toThrow(/"source" inválido/);
  });
});

describe("legacy mode (no source) — deprecated, kept until 3.0", () => {
  it("still falls back to backup.json and warns about the deprecation", async () => {
    project.write(BACKUP, readFixture("minimal"));
    process.env["BACKEND_URL"] = await deadUrl();

    await reflector(true);

    expect(project.exists(MODULE)).toBe(true);
    expect(project.warn.mock.calls.flat().join("\n")).toMatch(/DEPRECATED.*removidos na 3\.0/);
  });

  it("still requires BACKEND_URL", async () => {
    await expect(reflector(true)).rejects.toThrow("BACKEND_URL vazio");
  });
});

describe("CLI", () => {
  it.each([
    [["--spec", "a.json"], { help: false, source: { file: "a.json" } }],
    [["--spec=a.json"], { help: false, source: { file: "a.json" } }],
    [["--url", "http://x/openapi.json"], { help: false, source: { url: "http://x/openapi.json" } }],
    [[], { help: false }],
    [["--help"], { help: true }],
  ])("parses %j", (argv, expected) => {
    expect(parseCliArgs(argv)).toEqual(expected);
  });

  it.each([
    [["--spec"], /exige um valor/],
    [["--spec", "--url", "x"], /exige um valor/],
    [["--spec", "a.json", "--url", "http://x"], /só uma fonte/],
    [["--sepc", "a.json"], /Argumento desconhecido/],
  ])("rejects %j", (argv, message) => {
    expect(() => parseCliArgs(argv)).toThrow(CliUsageError);
    expect(() => parseCliArgs(argv)).toThrow(message);
  });

  it("--spec takes precedence over reflector.json source", async () => {
    project.write("good.json", readFixture("minimal"));
    withSource({ file: "missing.json" });

    expect(await runCli(["--spec", "good.json"])).toBe(0);
    expect(project.exists(MODULE)).toBe(true);
  });

  it("exits non-zero with a clear message when the contract is unreadable", async () => {
    expect(await runCli(["--spec", "missing.json"])).toBe(1);
    expect(project.error.mock.calls.flat().join("\n")).toMatch(/Não foi possível ler o contrato OpenAPI em .*missing\.json: arquivo não encontrado/);
    expect(project.exists(BACKUP)).toBe(false);
  });

  it("exits non-zero on bad flags", async () => {
    expect(await runCli(["--nope"])).toBe(1);
  });
});
