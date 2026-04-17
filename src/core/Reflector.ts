import * as path from "node:path";
import * as fs from "node:fs";
import * as process from "node:process";

import { Source } from "../file.js";
import { Module } from "./module/Module.js";
import { Schema } from "./schema/Schema.js";
import { CodegenContext } from "./CodegenContext.js";
import { InlineSchemaPromoter } from "./openapi/InlineSchemaPromoter.js";
import { SchemaRegistry } from "./schema/SchemaRegistry.js";
import { ModuleFactory } from "./module/ModuleFactory.js";
import { ModuleSchemaFileBuilder } from "./module/ModuleSchemaFileBuilder.js";
import { RuntimeFilesEmitter } from "./emit/RuntimeFilesEmitter.js";
import { resolveReflectorConfig } from "./config/ReflectorConfig.js";
import { generatedDir } from "../vars.global.js";

import type { ComponentsObject, OpenAPIObject, PathsObject } from "../types/open-api-spec.interface.js";
import type { FieldConfigs, TypeImports } from "../types/types.js";
import type { ReflectorConfig } from "./config/ReflectorConfig.js";

export class Reflector {
  readonly schemas: Schema[];
  readonly modules: Module[];
  readonly propertiesNames: Set<string>;

  private readonly registry: SchemaRegistry;
  private readonly typeImports: TypeImports;
  private readonly config: ReflectorConfig;
  private readonly context = new CodegenContext();

  private readonly srcDir = path.resolve(process.cwd(), `${generatedDir}/controllers`);
  private readonly localDoc = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/backup.json`) });

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

    InlineSchemaPromoter.promote(components, paths);

    this.modules = ModuleFactory.build({
      paths,
      apiImport,
      experimentalFeatures: experimentalFeatures ?? false,
      context: this.context,
      config: this.config,
    });

    this.registry = new SchemaRegistry({ components, fieldConfigs, context: this.context });
    this.schemas = this.registry.schemas;
    this.propertiesNames = this.registry.propertiesNames;
  }

  async build() {
    fs.rmSync(this.srcDir, { recursive: true, force: true });
    fs.mkdirSync(this.srcDir, { recursive: true });

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
      context: this.context,
    });

    await Promise.all([
      ...moduleSchemaFiles.map((f) => f.save()),
      ...runtimeFiles.map((f) => f.save()),
      ...this.modules.filter((m) => m.methods.length > 0).map((m) => m.src.save()),
      ...this.modules.filter((m) => m.methods.length > 0 && m.apiSrc).map((m) => m.apiSrc!.save()),
    ]);

    return {};
  }

  async localSave(data: OpenAPIObject) {
    this.localDoc.data = JSON.stringify(data);
    await this.localDoc.save();
  }
}
