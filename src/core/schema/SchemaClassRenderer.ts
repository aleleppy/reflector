import { ReflectorInterface } from "./ReflectorInterface.js";

import type { ArrayProp } from "../../props/array.property.js";
import type { EnumProp } from "../../props/enum.property.js";
import type { ObjectProp } from "../../props/object.property.js";
import type { PrimitiveProp } from "../../props/primitive.property.js";

export class SchemaClassRenderer {
  static render(params: {
    name: string;
    primitiveProps: PrimitiveProp[];
    arrayProps: ArrayProp[];
    objectProps: ObjectProp[];
    enumProps: EnumProp[];
    mode?: "request" | "response";
  }): { interface: string; schema: string; bundleHelper: "strict" | "inputs" } {
    const { name, primitiveProps, arrayProps, objectProps, enumProps } = params;
    const mode = params.mode ?? "response";

    const reflectorInterface = new ReflectorInterface({
      name,
      arrayProps,
      primitiveProps,
      objectProps,
      enumProps,
    });

    const constructorThis: string[] = [];
    const keys: string[] = [];
    const bundleParams: string[] = [];
    let staticMethod: string = "";

    primitiveProps.forEach((prop) => {
      constructorThis.push(prop.constructorBuild());
      bundleParams.push(prop.bundleBuild());
      keys.push(prop.classBuild());
    });

    arrayProps.forEach((prop) => {
      constructorThis.push(prop.constructorBuild());
      keys.push(prop.classBuild());
      bundleParams.push(prop.bundleBuild());

      staticMethod = prop.staticBuild();
    });

    objectProps.forEach((prop) => {
      constructorThis.push(prop.constructorBuild());
      keys.push(prop.classBuild());
      bundleParams.push(prop.bundleBuild());
    });

    enumProps.forEach((prop) => {
      constructorThis.push(prop.constructorBuild());
      keys.push(prop.classBuild());
      bundleParams.push(prop.bundleBuild());
    });

    const constructorCode = `constructor(params?: { data?: ${name}Interface | undefined, empty?: boolean }) {
        ${constructorThis.join(";\n")}
      }`;

    const hydrateLines: string[] = [];
    primitiveProps.forEach((p) => hydrateLines.push(p.hydrateBuild()));
    arrayProps.forEach((p) => hydrateLines.push(p.hydrateBuild()));
    objectProps.forEach((p) => hydrateLines.push(p.hydrateBuild()));
    enumProps.forEach((p) => hydrateLines.push(p.hydrateBuild()));

    const hydrateCode = `
      hydrate(data: Partial<${name}Interface>): void {
        ${hydrateLines.join(";\n")}
      }

      reset(): void {
        this.hydrate(new ${name}({ empty: true }).bundle() as Partial<${name}Interface>);
      }
    `;

    // Request DTO serializa a partir das instâncias `BuildedInput` (carregam os flags
    // required/nullable), não do `.value` pré-extraído — bundleInputs faz a coerção
    // nullable ''→null e cobre array/aninhado. Response fica em bundleStrict (inalterado).
    const bundleHelper: "strict" | "inputs" = mode === "request" ? "inputs" : "strict";
    const bundleBody =
      mode === "request"
        ? `return bundleInputs({ ${[...primitiveProps, ...arrayProps, ...objectProps, ...enumProps]
            .map((p) => `${p.name}: this.${p.name}`)
            .join(",")} })`
        : `return bundleStrict({ ${bundleParams.join(",")} })`;

    const schema = `
    export class ${name} {
      ${keys.join(";")}

      ${constructorCode}

      ${staticMethod}

      ${hydrateCode}

      bundle(){
        ${bundleBody}
      }
    };`;

    return { interface: reflectorInterface.builded, schema, bundleHelper };
  }
}
