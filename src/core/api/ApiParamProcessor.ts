import type { AttributeProp, ParamType } from "../../types/types.js";
import type { PrimitiveProp } from "../../props/primitive.property.js";
import { capitalizeFirstLetter } from "../../helpers/helpers.js";
import type { ModuleImports } from "../module/ModuleImports.js";
import type { ModuleClassBuilder } from "../module/ModuleClassBuilder.js";

export interface ApiProcessedParams {
  paramClasses: string[];
  paramAttributes: string[];
  paramReset: string[];
}

export class ApiParamProcessor {
  private readonly imports: ModuleImports;
  private readonly classBuilder: ModuleClassBuilder;

  constructor(params: { imports: ModuleImports; classBuilder: ModuleClassBuilder }) {
    this.imports = params.imports;
    this.classBuilder = params.classBuilder;
  }

  process(params: {
    methodName: string;
    querys: AttributeProp[];
    paths: PrimitiveProp[];
    headers: PrimitiveProp[];
    cookies: PrimitiveProp[];
  }): ApiProcessedParams {
    const { methodName, cookies, headers, paths, querys } = params;

    const paramClasses: string[] = [];
    const paramAttributes: string[] = [];
    const paramReset: string[] = [];

    const processParam = (paramData: { paramType: ParamType; attrName: string; props: AttributeProp[] }) => {
      const { paramType, attrName, props } = paramData;
      const className = `${capitalizeFirstLetter(methodName)}${capitalizeFirstLetter(paramType)}`;

      paramClasses.push(this.classBuilder.buildClassProps({ props, name: paramType, className }));
      paramAttributes.push(`${attrName} = new ${className}()`);
      paramReset.push(`this.${attrName} = new ${className}()`);
    };

    const argEntries = [
      { attrName: "querys", props: querys as AttributeProp[] },
      { attrName: "headers", props: headers as AttributeProp[] },
      { attrName: "paths", props: paths as AttributeProp[] },
      { attrName: "cookies", props: cookies as AttributeProp[] },
    ];

    for (const { attrName, props } of argEntries) {
      if (!props.length) continue;
      this.imports.addReflectorImport("QueryBuilder");
      const paramType = capitalizeFirstLetter(attrName) as ParamType;
      processParam({ paramType, attrName, props });
    }

    return { paramClasses, paramAttributes, paramReset };
  }
}
