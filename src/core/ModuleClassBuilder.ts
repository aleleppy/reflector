import type { AttributeProp, ParamType } from "../types/types.js";
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
      props.forEach((prop) => {
        if ("rawType" in prop) {
          attributes.push(prop.patchBuild());
        }
      });

      this.imports.addPageStateImport();

      return `
      class ${name} {
        ${attributes.join(";")}
      }
      `;
    } else if (name === "Querys") {
      props.forEach((prop) => {
        if ("rawType" in prop) {
          attributes.push(prop.queryBuild());

          if ("isEnum" in prop && prop.isEnum) {
            this.imports.addReflectorImport("EnumQueryBuilder");
            this.imports.addEnumImport(String(prop.type));
            bundle.push(`${prop.name}: this.${prop.name}?.values`);
          } else {
            bundle.push(prop.bundleBuild());
          }
        } else if ("enumName" in prop) {
          this.imports.addEnumImport(prop.enumName);
          attributes.push(prop.queryBuild());
          bundle.push(prop.bundleBuild());
        } else {
          attributes.push(prop.queryBuild());
          this.imports.addEnumImport(prop.type);
          bundle.push(prop.queryBundleBuild());
          this.imports.addReflectorImport("EnumQueryBuilder");
        }
      });
    } else {
      props.forEach((prop) => {
        if ("isEnum" in prop || "enumName" in prop) {
          this.imports.addEnumImport((prop as { type: string }).type);
        }
        attributes.push(prop.classBuild());
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
