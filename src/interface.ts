import type { ArrayProp } from "./array.property.js";
import type { EnumProp } from "./enum-property.js";
import type { ObjectProp } from "./object.property.js";
import type { PrimitiveProp } from "./primitive-property.js";

export class ReflectorInterface {
  builded: string;

  constructor(params: {
    primitiveProps: PrimitiveProp[];
    arrayProps: ArrayProp[];
    name: string;
    objectProps: ObjectProp[];
    enumProps: EnumProp[];
  }) {
    const { name, arrayProps, primitiveProps, objectProps, enumProps } = params;

    const buildedProps: string[] = [];

    primitiveProps.forEach((prop) => {
      buildedProps.push(prop.interfaceBuild());
    });

    arrayProps.forEach((prop) => {
      buildedProps.push(prop.interfaceBuild());
    });

    objectProps.forEach((prop) => {
      buildedProps.push(prop.interfaceBuild());
    });

    enumProps.forEach((prop) => {
      buildedProps.push(prop.interfaceBuild());
    });

    this.builded = `
      export interface ${name}Interface {
        ${buildedProps}
      }
    `;
  }
}
