import type { AttributeProp } from "../types/types.js";
import type { ArrayProp } from "../props/array.property.js";

interface ParamProcessorResult {
  buildedParamsTypes: string[];
  paramAttributes: Set<string>;
  paramInit: Set<string>;
  paramClear: Set<string>;
  reflectorImports: Set<string>;
  enumImports: Set<string>;
}

export class ModuleParameterProcessor {
  process(params: {
    querys: AttributeProp[];
    paths: AttributeProp[];
    headers: AttributeProp[];
    cookies: AttributeProp[];
  }): ParamProcessorResult {
    const { cookies, headers, paths, querys } = params;
    const buildedParamsTypes: string[] = [];
    const paramAttributes = new Set<string>();
    const paramInit = new Set<string>();
    const paramClear = new Set<string>();
    const reflectorImports = new Set<string>();
    const enumImports = new Set<string>();

    const argEntries = [
      { name: "querys", props: querys },
      { name: "headers", props: headers },
      { name: "paths", props: paths },
      { name: "cookies", props: cookies },
    ];

    for (const { name, props } of argEntries) {
      if (!props.length) continue;
      reflectorImports.add("QueryBuilder");
      const capitalizedName = this.capitalizeFirstLetter(name);
      
      // Check for enum arrays in querys
      if (name === "querys") {
        for (const prop of props) {
          if (this.isArrayProp(prop) && prop.isEnum) {
            reflectorImports.add("EnumQueryBuilder");
            enumImports.add(prop.type);
          }
        }
      }
      
      buildedParamsTypes.push(this.buildClassProps({ props, name: capitalizedName as "Paths" | "Querys" | "Headers" }));
      paramAttributes.add(`${name} = new ${capitalizedName}()`);
      paramInit.add(`this.clear${capitalizedName}()`);
      paramClear.add(`clear${capitalizedName}() { this.${name} = new ${capitalizedName}() }`);
    }

    return { buildedParamsTypes, paramAttributes, paramInit, paramClear, reflectorImports, enumImports };
  }

  private isArrayProp(prop: AttributeProp): prop is ArrayProp {
    return "isEnum" in prop && "type" in prop;
  }

  private buildClassProps(params: { props: AttributeProp[]; name: "Paths" | "Querys" | "Headers" }): string {
    const { name, props } = params;
    const attributes: string[] = [];
    const bundle: string[] = [];

    if (name === "Paths") {
      props.forEach((prop) => {
        if ("rawType" in prop) attributes.push(prop.patchBuild());
      });
      return `
        class ${name} {
          ${attributes.join(";")}
        }
      `;
    } else if (name === "Querys") {
      props.forEach((prop) => {
        if ("rawType" in prop) {
          attributes.push(prop.queryBuild());
          bundle.push(this.buildBundleEntry(prop));
        }
      });
    } else {
      props.forEach((prop) => attributes.push(prop.classBuild()));
    }

    const bundleBuild = bundle.length > 0 ? `
      bundle() {
        return { ${bundle.join(",")} }
      }
    ` : "";

    return `
      class ${name} {
        ${attributes.join(";")}
        ${bundleBuild}
      }
    `;
  }

  private buildBundleEntry(prop: AttributeProp): string {
    // For array enum queries, use .values
    if (this.isArrayProp(prop) && prop.isEnum) {
      return `${prop.name}: this.${prop.name}?.values`;
    }
    return prop.bundleBuild();
  }

  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
