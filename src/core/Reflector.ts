import * as path from "node:path";
import * as process from "node:process";

import { Source } from "../file.js";
import { Module } from "./module/Module.js";
import { Schema } from "./schema/Schema.js";
import { CodegenContext } from "./CodegenContext.js";
import { AliasOperationFilter } from "./openapi/AliasOperationFilter.js";
import { InlineSchemaPromoter } from "./openapi/InlineSchemaPromoter.js";
import { SchemaRegistry } from "./schema/SchemaRegistry.js";
import { ModuleFactory } from "./module/ModuleFactory.js";
import { ModuleSchemaFileBuilder } from "./module/ModuleSchemaFileBuilder.js";
import { RuntimeFilesEmitter } from "./emit/RuntimeFilesEmitter.js";
import { AtomicOutput } from "./emit/AtomicOutput.js";
import { resolveReflectorConfig } from "./config/ReflectorConfig.js";
import { generatedDir } from "../vars.global.js";

import type { ComponentsObject, PathsObject } from "../types/open-api-spec.interface.js";
import type { FieldConfigs, TypeImports } from "../types/types.js";
import type { ReflectorConfig } from "./config/ReflectorConfig.js";

export class Reflector {
  readonly schemas: Schema[];
  readonly modules: Module[];
  readonly propertiesNames: Set<string>;
  readonly formatNames: Set<string>;

  private readonly registry: SchemaRegistry;
  private readonly typeImports: TypeImports;
  private readonly config: ReflectorConfig;
  private readonly context = new CodegenContext();

  private readonly outDir = path.resolve(process.cwd(), generatedDir);

  constructor(params: {
    components: ComponentsObject;
    paths: PathsObject;
    fieldConfigs: FieldConfigs;
    typeImports: TypeImports;
    apiImport: string;
    experimentalFeatures?: boolean;
    config?: Partial<ReflectorConfig>;
  }) {
    const { components, paths, fieldConfigs, typeImports, apiImport, experimentalFeatures, config } = params;
    this.typeImports = typeImports;
    this.config = resolveReflectorConfig(config);

    AliasOperationFilter.apply(paths);
    InlineSchemaPromoter.promote(components, paths);

    this.modules = ModuleFactory.build({
      paths,
      apiImport,
      experimentalFeatures: experimentalFeatures ?? false,
      context: this.context,
      config: this.config,
    });

    const requestBodyNames = new Set(this.modules.flatMap((m) => m.requestBodyNames));

    this.registry = new SchemaRegistry({ components, fieldConfigs, context: this.context, requestBodyNames });
    this.schemas = this.registry.schemas;
    this.propertiesNames = this.registry.propertiesNames;
    this.formatNames = this.registry.formatNames;
  }

  /**
   * All-or-nothing: if any file fails (prettier included), the previous
   * generated output stays intact. `controllers/` is replaced wholesale so
   * modules removed from the contract disappear.
   */
  async build() {
    const moduleSchemaFiles: Source[] = [];
    for (const module of this.modules) {
      if (module.methods.length === 0 || module.schemaClassNames.length === 0) continue;

      const neededSchemas = this.registry.resolveTransitiveDeps(module.schemaClassNames);
      if (neededSchemas.length === 0) continue;

      const data = ModuleSchemaFileBuilder.build({ schemas: neededSchemas, typeImports: this.typeImports, config: this.config });
      const schemaFilePath = module.src.path.replace(".module.svelte.ts", ".schema.svelte.ts");
      moduleSchemaFiles.push(new Source({ path: schemaFilePath, data }));
    }

    const runtimeFiles = RuntimeFilesEmitter.build({
      propertiesNames: this.propertiesNames,
      formatNames: this.formatNames,
      context: this.context,
      config: this.config,
    });

    const emittedModules = this.modules.filter((m) => m.methods.length > 0);

    await AtomicOutput.commit({
      root: this.outDir,
      replaceDirs: ["controllers"],
      sources: [
        ...moduleSchemaFiles,
        ...runtimeFiles,
        ...emittedModules.map((m) => m.src),
        ...emittedModules.flatMap((m) => (m.apiSrc ? [m.apiSrc] : [])),
      ],
    });

    return {};
  }
}
