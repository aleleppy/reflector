import { mockedParams } from "../../main.js";
import type { AttributeProp, ParamType } from "../../types/types.js";
import type { ModuleImports } from "./ModuleImports.js";

export class ModuleClassBuilder {
  private readonly imports: ModuleImports;

  constructor(params: { imports: ModuleImports }) {
    this.imports = params.imports;
  }

  buildClassProps(params: { props: AttributeProp[]; name: ParamType }): string {
    const { name, props } = params;

    const bundle: string[] = [];
    const attributes: string[] = [];

    if (name === "Paths") {
      this.imports.addMockedImport("mockedParams");
      props.forEach((prop) => {
        if ("rawType" in prop) {
          attributes.push(prop.patchBuild());
        }

        mockedParams.add(prop.name);
      });

      this.imports.addPageStateImport();

      return `
        class ${name} {
          ${attributes.join(";")}
        }
      `;
    } else if (name === "Querys") {
      this.imports.addSetQueryGroupImport();
      const queryGroupValues: string[] = [];

      props.forEach((prop) => {
        if ("rawType" in prop) {
          attributes.push(prop.queryBuild());

          if ("isEnum" in prop && prop.isEnum) {
            this.imports.addReflectorImport("EnumQueryBuilder");
            this.imports.addEnumImport(String(prop.type));
            bundle.push(`${prop.name}: this.${prop.name}?.values`);
            // Array de enum usa valor padrão []
            queryGroupValues.push(`{ key: '${prop.name}', value: ${prop.queryDefaultValue()} }`);
          } else {
            bundle.push(prop.bundleBuild());
            // PrimitiveProp usa seu valor padrão
            queryGroupValues.push(`{ key: '${prop.name}', value: ${prop.queryDefaultValue()} }`);
          }
        } else if ("enumName" in prop) {
          // EnumProp
          this.imports.addEnumImport(prop.enumName);
          attributes.push(prop.queryBuild());
          bundle.push(prop.bundleBuild());
          queryGroupValues.push(`{ key: '${prop.name}', value: ${prop.queryDefaultValue()} }`);
        } else {
          // ArrayProp (não-enum)
          attributes.push(prop.queryBuild());
          this.imports.addEnumImport(prop.type);
          bundle.push(prop.queryBundleBuild());
          this.imports.addReflectorImport("EnumQueryBuilder");
          queryGroupValues.push(`{ key: '${prop.name}', value: ${prop.queryDefaultValue()} }`);
        }
      });

      const constructorBuild = `
        constructor() {
          setQueryGroup([
            ${queryGroupValues.join(",\n            ")}
          ]);
        }
      `;

      return `
        class ${name} {
          ${attributes.join(";")}

          ${constructorBuild}

          ${bundle.length > 0 ? `
          bundle() {
            return {
              ${bundle.join(",")}
            }
          }
          ` : ""}
        }
      `;
    } else if (name === "Headers") {
      this.imports.addReflectorImport("BuildedInput");
      this.imports.addReflectorImport("build");
      props.forEach((prop) => {
        const buildedProp = `${prop.classBuild()} = build({required: true, example: '', placeholder: ''})`;
        attributes.push(buildedProp);
        bundle.push(prop.bundleBuild());
      });
    }

    const bundleBuild =
      bundle.length > 0
        ? `
      bundle() {
        return {
          ${bundle.join(",")}
        }
      }
    `
        : "";

    return `
      class ${name} {
        ${attributes.join(";")}

        ${bundleBuild}
      }
    `;
  }
}
