/**
 * Renders the wrapper class + interface alias for an array-root schema — a
 * component whose top level is `type: array` (e.g. a promoted `data: array`
 * response envelope). Unlike object schemas (handled by `SchemaClassRenderer`),
 * the interface is a bare array alias (`type XInterface = ItemInterface[]`)
 * because the response envelope's `data` is already unwrapped: the consumer
 * calls `new X({ data: response })` with `response` being the array itself.
 */
export class ArraySchemaRenderer {
  static render(params: { name: string; elementType: string; isRef: boolean }): {
    interface: string;
    schema: string;
  } {
    const { name, elementType, isRef } = params;

    const interfaceElement = isRef ? `${elementType}Interface` : elementType;
    const interfaceAlias = `export type ${name}Interface = ${interfaceElement}[]`;

    const constructorBody = isRef
      ? `this.data = params?.data?.map((item) => new ${elementType}({ data: item })) ?? []`
      : `this.data = params?.data ?? []`;
    const staticBody = isRef
      ? `return data.map((item) => new ${elementType}({ data: item }))`
      : `return data`;
    const bundleBody = isRef ? `return this.data.map((item) => item.bundle())` : `return this.data`;

    const schema = `
    export class ${name} {
      data = $state<${elementType}[]>([]);

      constructor(params?: { data?: ${name}Interface | undefined, empty?: boolean }) {
        ${constructorBody}
      }

      static from(data: ${name}Interface) {
        ${staticBody}
      }

      bundle(): ${name}Interface {
        ${bundleBody}
      }
    };`;

    return { interface: interfaceAlias, schema };
  }
}
