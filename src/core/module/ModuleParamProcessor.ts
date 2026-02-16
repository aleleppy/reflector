import type { AttributeProp, ParamType } from "../../types/types.js";
import type { PrimitiveProp } from "../../props/primitive.property.js";
import { capitalizeFirstLetter } from "../../helpers/helpers.js";
import type { ModuleImports } from "./ModuleImports.js";
import type { ModuleClassBuilder } from "./ModuleClassBuilder.js";

export interface ProcessedParams {
  buildedParamsTypes: string[];
  paramAttributes: string[];
  paramInit: string[];
  paramClear: string[];
}

export class ModuleParamProcessor {
  private readonly imports: ModuleImports;
  private readonly classBuilder: ModuleClassBuilder;

  constructor(params: { imports: ModuleImports; classBuilder: ModuleClassBuilder }) {
    this.imports = params.imports;
    this.classBuilder = params.classBuilder;
  }

  process(params: {
    querys: AttributeProp[];
    paths: PrimitiveProp[];
    headers: PrimitiveProp[];
    cookies: PrimitiveProp[];
  }): ProcessedParams {
    const { cookies, headers, paths, querys } = params;

    const buildedParamsTypes: string[] = [];
    const paramAttributes = new Set<string>();
    const paramInit = new Set<string>([]);
    const paramClear = new Set<string>([]);

    const getParams = (paramsData: { name: string; props: AttributeProp[] }) => {
      const { name, props } = paramsData;
      const capitalizedName = capitalizeFirstLetter(name) as ParamType;

      buildedParamsTypes.push(this.classBuilder.buildClassProps({ props, name: capitalizedName }));
      paramAttributes.add(`${name} = new ${capitalizedName}()`);
      paramInit.add(`this.clear${capitalizeFirstLetter(capitalizedName)}()`);
      paramClear.add(`clear${capitalizedName}() { this.${name} = new ${capitalizedName}() }`);
    };

    const argEntries = [
      { name: "querys", props: querys },
      { name: "headers", props: headers },
      { name: "paths", props: paths },
      { name: "cookies", props: cookies },
    ];

    for (const { name, props } of argEntries) {
      if (!props.length) continue;
      this.imports.addReflectorImport("QueryBuilder");
      getParams({ name, props });
    }

    return {
      buildedParamsTypes,
      paramAttributes: Array.from(paramAttributes),
      paramInit: Array.from(paramInit),
      paramClear: Array.from(paramClear),
    };
  }
}
