import { DiscriminatedInterfaceRenderer } from "./DiscriminatedInterfaceRenderer.js";
import { ReflectorInterface } from "./ReflectorInterface.js";

import type { ArrayProp } from "../../props/array.property.js";
import type { EnumProp } from "../../props/enum.property.js";
import type { ObjectProp } from "../../props/object.property.js";
import type { PrimitiveProp } from "../../props/primitive.property.js";
import type { UnionProp } from "../../props/union.property.js";

export class SchemaClassRenderer {
  static render(params: {
    name: string;
    primitiveProps: PrimitiveProp[];
    arrayProps: ArrayProp[];
    objectProps: ObjectProp[];
    enumProps: EnumProp[];
    unionProps: UnionProp[];
    mode?: "request" | "response";
  }): { interface: string; schema: string; bundleHelper: "strict" | "inputs" } {
    const { name, primitiveProps, arrayProps, objectProps, enumProps, unionProps } = params;
    const mode = params.mode ?? "response";

    // A `oneOf` with a usable discriminator turns the Interface into a discriminated
    // union type alias; the matching `discriminated()` accessor is emitted below.
    const discriminatedUnion = unionProps.find((u) => u.hasDiscriminator);

    const interfaceStr = discriminatedUnion
      ? DiscriminatedInterfaceRenderer.render({
          name,
          union: discriminatedUnion,
          primitiveProps,
          arrayProps,
          objectProps,
          enumProps,
          otherUnionProps: unionProps.filter((u) => u !== discriminatedUnion),
        })
      : new ReflectorInterface({ name, arrayProps, primitiveProps, objectProps, enumProps, unionProps }).builded;

    const constructorThis: string[] = [];
    const keys: string[] = [];
    const bundleParams: string[] = [];
    let staticMethod: string = "";

    // Optional, always-instantiated sub-DTOs (`nome? = $state<T>(new T)`): the
    // runtime gate reads this set to skip an empty optional block instead of
    // flagging its inner `required` fields. Emitted only when non-empty.
    const optionalDtoNames = objectProps
      .map((prop) => prop.optionalGateName())
      .filter((name): name is string => name !== null);
    const optionalDtosDecl = optionalDtoNames.length
      ? `readonly _optionalDtos = new Set<string>([${optionalDtoNames.map((name) => `"${name}"`).join(", ")}])`
      : "";

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

    unionProps.forEach((prop) => {
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
    unionProps.forEach((p) => hydrateLines.push(p.hydrateBuild()));

    const hydrateCode = `
      hydrate(data: Partial<${name}Interface>): void {
        ${hydrateLines.join(";\n")}
      }

      reset(): void {
        this.hydrate(new ${name}({ empty: true }).bundle() as Partial<${name}Interface>);
      }
    `;

    // Live class instances can't narrow `actionMeta` by `action` (independent
    // `$state` fields), so expose a plain discriminated snapshot for consumers
    // that want the narrowing. `bundle()` already returns the discriminated type
    // (see below), so this is just an ergonomic, cast-free alias.
    const discriminatedAccessor = discriminatedUnion
      ? `discriminated(): ${name}Interface { return this.bundle(); }`
      : "";

    // Request DTO serializa a partir das instâncias `BuildedInput` (carregam os flags
    // required/nullable), não do `.value` pré-extraído — bundleInputs faz a coerção
    // nullable ''→null e cobre array/aninhado. Response fica em bundleStrict (inalterado).
    //
    // Para um schema com união discriminada, `bundleStrict` infere a forma plana (action
    // = enum inteiro), que NÃO é atribuível a nenhum membro da união — o array-root wrapper
    // (`item.bundle()` tipado como `Interface[]` discriminada) quebraria. O único `as` do
    // feature mora aqui, fazendo `bundle()` devolver a própria união; `discriminated()` e
    // `reset()` ficam cast-free por consequência.
    const bundleHelper: "strict" | "inputs" = mode === "request" ? "inputs" : "strict";
    const responseBundle = discriminatedUnion
      ? `return bundleStrict({ ${bundleParams.join(",")} }) as ${name}Interface`
      : `return bundleStrict({ ${bundleParams.join(",")} })`;
    const bundleBody =
      mode === "request"
        ? `return bundleInputs({ ${[...primitiveProps, ...arrayProps, ...objectProps, ...enumProps, ...unionProps]
            .map((p) => `${p.name}: this.${p.name}`)
            .join(",")} })`
        : responseBundle;

    const schema = `
    export class ${name} {
      ${[...keys, optionalDtosDecl].filter(Boolean).join(";\n      ")}

      ${constructorCode}

      ${staticMethod}

      ${hydrateCode}

      bundle(){
        ${bundleBody}
      }

      ${discriminatedAccessor}
    };`;

    return { interface: interfaceStr, schema, bundleHelper };
  }
}
