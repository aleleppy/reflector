import { splitByUppercase, treatByUppercase } from "../helpers/helpers.js";
import type { CodegenContext } from "../core/CodegenContext.js";

export class EnumProp {
  name: string;
  isParam: boolean;
  readonly type: string;
  enumName: string;

  private readonly isRequired: boolean;
  private readonly example: string;

  constructor(params: {
    name: string;
    enums: string[];
    required: boolean;
    isParam: boolean | undefined;
    entityName: string;
    context: CodegenContext;
  }) {
    const { name, required, isParam, enums, entityName, context } = params;

    this.name = name;
    this.isParam = !!isParam;
    this.isRequired = required;

    this.type = enums.map((e) => `'${e}'`).join(",");

    const existing = context.enumTypes.get(this.type);

    if (!existing) {
      const teste = splitByUppercase(treatByUppercase(entityName)).map((x) => x.toUpperCase());
      const naaa = `ENUM_${teste.join("_")}_${this.name.toUpperCase()}`.split("_");
      const typeName = [...new Set(naaa)].join("_");
      context.enumTypes.set(this.type, typeName);
    }

    this.example = enums[0] as string;
    this.enumName = context.enumTypes.get(this.type) ?? "";
  }

  classBuild() {
    const req = this.isRequired ? "" : "?";

    return `${this.name}${req}: BuildedInput<${this.enumName}>`;
  }

  constructorBuild() {
    return `this.${this.name} = build({ key: params?.data?.${this.name}, placeholder: '${this.example}', example: '${this.example}', required: ${this.isRequired}})`;
  }

  interfaceBuild() {
    const req = this.isRequired ? "" : "?";

    return `${this.name}${req}: ${this.enumName}`;
  }

  queryBuild() {
    return `readonly ${this.name} = new QueryBuilder({ key: '${this.name}' })`;
  }

  bundleBuild() {
    return `${this.name}: this.${this.name}?.value`;
  }
}
