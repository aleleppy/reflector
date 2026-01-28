import type { PrimitiveProp } from "./primitive-property.js";
import type { ArrayProp, ObjectProp } from "./property.js";

export class ReflectorInterface {
  builded: string;

  constructor(params: { primitiveProps: PrimitiveProp[]; arrayProps: ArrayProp[]; name: string; objectProps: ObjectProp[] }) {
    const { name, arrayProps, primitiveProps, objectProps } = params;

    const buildedProps: string[] = [];

    arrayProps.forEach((prop) => {
      buildedProps.push(prop.interfaceBuild());
    });

    primitiveProps.forEach((prop) => {
      buildedProps.push(prop.interfaceBuild());
    });

    objectProps.forEach((prop) => {
      buildedProps.push(prop.interfaceBuild());
    });

    this.builded = `
      export interface ${name}Interface {
        ${buildedProps}
      }
    `;
  }
}
