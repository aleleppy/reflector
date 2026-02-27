import type { SchemaObject } from "../types/open-api-spec.interface.js";
import type { ReflectorParamType } from "../types/types.js";

type AbstractType = string | boolean | number | undefined;
type Example = string | boolean | number;
// type FallbackExample = string | false | number;

export class PrimitiveProp {
  name: string;
  type: AbstractType;
  isSpecial: boolean = false;
  isParam: boolean;

  private readonly required: boolean;
  readonly rawType: ReflectorParamType;
  private readonly buildedConst: string;
  private readonly example: Example;
  private readonly fallbackExample: Example;

  constructor(params: {
    name: string;
    schemaObject: SchemaObject;
    required: boolean;
    validator: string | undefined;
    isParam: boolean | undefined;
  }) {
    const { name, schemaObject, required, validator, isParam } = params;
    const { type: rawType } = schemaObject;

    const type = (rawType as ReflectorParamType) ?? "string";

    const { emptyExample, example } = this.getExampleAndFallback({ schemaObject, type });

    this.example = example;
    this.fallbackExample = emptyExample;

    const buildedType = type;

    this.name = this.treatName(name);
    this.rawType = type ?? "any";
    this.type = `BuildedInput<${buildedType}>`;
    this.required = required;

    this.isParam = !!isParam;

    this.buildedConst = this.buildConst({ example, name: this.name, required, type, validator, emptyExample: this.example });
  }

  private treatName(name: string) {
    let newName = name;

    if (name.split("-").length > 1) {
      this.isSpecial = true;
      newName = `['${name}']`;
    }

    return newName;
  }

  private getEmptyExample(params: { type: ReflectorParamType; schemaObject: SchemaObject }) {
    const { schemaObject, type } = params;

    if (type === "number") {
      return 1;
    } else if (type === "boolean") {
      return false;
    } else if (schemaObject.enum) {
      return `"${schemaObject.enum[0]}"`;
    } else {
      return "''";
    }
  }

  private getExampleAndFallback(params: { schemaObject: SchemaObject; type: ReflectorParamType }) {
    const { schemaObject, type } = params;

    const example: AbstractType = schemaObject.example ?? schemaObject.default;
    const emptyExample = this.getEmptyExample({ type, schemaObject });

    if (!example)
      return {
        example: emptyExample,
        emptyExample,
      };

    if (type === "string")
      return {
        example: `"${example}"`,
        emptyExample,
      };

    return {
      example,
      emptyExample,
    };
  }

  private buildConst(params: {
    name: string;
    example: AbstractType;
    emptyExample: Example;
    required: boolean;
    type: ReflectorParamType | undefined;
    validator: string | undefined;
  }) {
    const { name, required, type, validator } = params;

    const getValidator = (type: ReflectorParamType) => {
      if (type === "string") {
        return "emptyString";
      }

      return null;
    };

    const buildedValidator = () => {
      if (validator) {
        return `validator: ${validator}`;
      } else if (required && type) {
        const v = getValidator(type);
        return v ? `validator: validateInputs.${v}` : "";
      }

      return "";
    };

    const buildedExample = `params?.empty || isEmpty ? ${this.fallbackExample} : ${this.example}`;

    return `
      build({ key: params?.data?.${name}, placeholder: ${this.fallbackExample}, example: ${buildedExample}, required: ${required}, ${buildedValidator()}})
    `;
  }

  private thisDot() {
    return `this${this.isSpecial ? "" : "."}`;
  }

  constructorBuild() {
    return `${this.thisDot()}${this.name} = ${this.buildedConst}`;
  }

  classBuild() {
    const req = this.required ? "" : "?";

    return `${this.name}${req}: ${this.type}`;
  }

  interfaceBuild() {
    const req = this.required ? "" : "?";

    return `${this.name}${req}: ${this.rawType}`;
  }

  patchBuild() {
    return `readonly ${this.name} = $derived.by(() => '${this.name}' in page.params ? page.params.${this.name} : mockedParams.${this.name}) as string | null;`;
  }

  queryBuild() {
    const example = this.rawType === "string" ? this.fallbackExample : this.example;

    return `readonly ${this.name} = $derived(new QueryBuilder({ key: '${this.name}', value: ${example} }))`;
  }

  updateQueryBuild() {
    return `${this.name}: (event: SvelteEvent) => changeParam({ key: '${this.name}', event })`;
  }

  bundleBuild() {
    return `${this.name}: ${this.thisDot()}${this.name}?.value`;
  }
}
