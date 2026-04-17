import * as path from "node:path";
import * as process from "node:process";

import { Source } from "../../file.js";
import { loadReflectorTemplate } from "../../loadTemplate.js";
import { generatedDir } from "../../vars.global.js";

import type { CodegenContext } from "../CodegenContext.js";

/**
 * Emits the shared runtime-support files that sit alongside the generated
 * module files: the reflector runtime template, the FIELD_NAMES list, the
 * enum unions, and the MockedParams class used by path-param stubs.
 */
export class RuntimeFilesEmitter {
  static build(params: { propertiesNames: Set<string>; context: CodegenContext }): Source[] {
    const { propertiesNames, context } = params;

    const typesSrc = new Source({
      path: path.resolve(process.cwd(), `${generatedDir}/reflector.svelte.ts`),
      data: loadReflectorTemplate(),
    });

    const fieldsFile = new Source({
      path: path.resolve(process.cwd(), `${generatedDir}/fields.ts`),
      data: `
      export const FIELD_NAMES = [
        ${Array.from(propertiesNames).map((p) => `'${p}'`)}
      ] as const;
      export type FieldName = (typeof FIELD_NAMES)[number]
    `,
    });

    const enumss = Array.from(context.enumTypes)
      .map(([types, key]) => {
        return `export const ${key} = [ ${types} ] as const; export type ${key} = typeof ${key}[number] `;
      })
      .join(";");

    const enumFile = new Source({
      path: path.resolve(process.cwd(), `${generatedDir}/enums.ts`),
      data: enumss,
    });

    const mockedParamss = Array.from(context.mockedParams)
      .map((paramName) => {
        return `${paramName} = $state<string | null>(null)`;
      })
      .join(";");

    const mockedFile = new Source({
      path: path.resolve(process.cwd(), `${generatedDir}/mocked-params.svelte.ts`),
      data: `
      class MockedParams {
        ${mockedParamss}
      }

      const mockedParams = new MockedParams()
      export default mockedParams
    `,
    });

    return [typesSrc, fieldsFile, enumFile, mockedFile];
  }
}
