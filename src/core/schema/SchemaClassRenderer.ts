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
  }): { interface: string; schema: string } {
    const { name, primitiveProps, arrayProps, objectProps, enumProps } = params;

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

    const schema = `
    export class ${name} {
      ${keys.join(";")}

      ${constructorCode}

      ${staticMethod}

      bundle(){
        return bundleStrict({ ${bundleParams.join(",")} })
      }
    };`;

    return { interface: reflectorInterface.builded, schema };
  }
}
