import * as path from "node:path";
import * as process from "node:process";

import { Source } from "../../file.js";
import { loadReflectorTemplate } from "../../loadTemplate.js";
import { generatedDir } from "../../vars.global.js";
import { dedent } from "../../helpers/codegen.js";
import { DEFAULT_REFLECTOR_CONFIG } from "../config/ReflectorConfig.js";

import type { CodegenContext } from "../CodegenContext.js";
import type { ReflectorConfig } from "../config/ReflectorConfig.js";

function generated(relPath: string): string {
  return path.resolve(process.cwd(), `${generatedDir}/${relPath}`);
}

/**
 * Emits the shared runtime-support files that sit alongside the generated
 * module files: the reflector runtime template, the FIELD_NAMES list, the
 * enum unions, and the MockedParams class used by path-param stubs.
 */
export class RuntimeFilesEmitter {
  static build(params: { propertiesNames: Set<string>; context: CodegenContext; config: ReflectorConfig }): Source[] {
    const { propertiesNames, context, config } = params;

    let templateData = loadReflectorTemplate();
    if (config.toastImport !== DEFAULT_REFLECTOR_CONFIG.toastImport) {
      templateData = templateData.replace(
        `from "${DEFAULT_REFLECTOR_CONFIG.toastImport}"`,
        `from "${config.toastImport}"`,
      );
    }

    const typesSrc = new Source({
      path: generated("reflector.svelte.ts"),
      data: templateData,
    });

    const fieldLiterals = Array.from(propertiesNames).map((p) => `'${p}'`);
    const fieldsFile = new Source({
      path: generated("fields.ts"),
      data: dedent`
        export const FIELD_NAMES = [
          ${fieldLiterals}
        ] as const;
        export type FieldName = (typeof FIELD_NAMES)[number]
      `,
    });

    const enumss = Array.from(context.enumTypes)
      .map(([types, key]) => `export const ${key} = [ ${types} ] as const; export type ${key} = typeof ${key}[number] `)
      .join(";");

    const enumFile = new Source({
      path: generated("enums.ts"),
      data: enumss,
    });

    const mockedFields = Array.from(context.mockedParams)
      .map((paramName) => `${paramName} = $state<string | null>(null)`)
      .join(";");

    const mockedFile = new Source({
      path: generated("mocked-params.svelte.ts"),
      data: dedent`
        class MockedParams {
          ${mockedFields}
        }

        const mockedParams = new MockedParams()
        export default mockedParams
      `,
    });

    return [typesSrc, fieldsFile, enumFile, mockedFile];
  }
}
