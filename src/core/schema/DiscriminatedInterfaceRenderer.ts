import type { ArrayProp } from "../../props/array.property.js";
import type { EnumProp } from "../../props/enum.property.js";
import type { ObjectProp } from "../../props/object.property.js";
import type { PrimitiveProp } from "../../props/primitive.property.js";
import type { UnionProp } from "../../props/union.property.js";

interface AnyProp {
  name: string;
  interfaceBuild(): string;
}

/**
 * Renders a schema's `Interface` as a *discriminated union* type alias when one
 * of its properties is a `oneOf` carrying a `discriminator` whose `propertyName`
 * points at a sibling enum property (e.g. `NotificationData.actionMeta` keyed by
 * `action`). Each `discriminator.mapping` entry (action value → variant schema)
 * becomes a union member that pins `action` to its literal(s) and `actionMeta`
 * to the matching variant `Interface`:
 *
 * ```ts
 * export type NotificationDataInterface =
 *   | { ...commons; action: "STOCK_LOW" | "STOCK_OUT"; actionMeta: ProductStockMetaInterface }
 *   | { ...commons; action: "ANNOUNCEMENT"; actionMeta: UrlMetaInterface };
 * ```
 *
 * This is what makes `if (n.action === "STOCK_LOW") n.actionMeta.productId`
 * narrow on plain `Interface`-typed values (raw response data, `.bundle()`,
 * `.discriminated()`). It never narrows on the live `$state` class instance —
 * TS can't correlate two independent mutable fields.
 */
export class DiscriminatedInterfaceRenderer {
  static render(params: {
    name: string;
    union: UnionProp;
    primitiveProps: PrimitiveProp[];
    arrayProps: ArrayProp[];
    objectProps: ObjectProp[];
    enumProps: EnumProp[];
    otherUnionProps: UnionProp[];
  }): string {
    const { name, union, primitiveProps, arrayProps, objectProps, enumProps, otherUnionProps } = params;

    const discProp = union.discriminator!.propertyName;
    const mapping = union.discriminator!.mapping ?? {};

    // Commons = every property except the discriminant and the discriminated union itself.
    const allProps: AnyProp[] = [
      ...primitiveProps,
      ...arrayProps,
      ...objectProps,
      ...enumProps,
      ...otherUnionProps,
    ];
    const commons = allProps
      .filter((p) => p.name !== discProp && p.name !== union.name)
      .map((p) => p.interfaceBuild());

    // Invert the mapping: variant schema name → the action literals that select it,
    // preserving first-seen order so output stays deterministic.
    const byVariant = new Map<string, string[]>();
    for (const [actionValue, ref] of Object.entries(mapping)) {
      const variant = ref.split("/").at(-1) ?? "";
      if (!variant) continue;
      const list = byVariant.get(variant) ?? [];
      list.push(actionValue);
      byVariant.set(variant, list);
    }

    // The discriminated part: only the discriminant + the union field vary per variant.
    // Commons are factored into a single object type and intersected with the union —
    // narrowing on `action` still works through the intersection.
    const members = [...byVariant.entries()].map(([variant, actions]) => {
      const literals = actions.map((a) => `"${a}"`).join(" | ");
      return `{ ${discProp}: ${literals}; ${union.name}: ${variant}Interface }`;
    });

    const variantUnion = members.map((m) => `| ${m}`).join("\n");

    // No commons → emit the bare union (avoid a pointless `{} & (...)`).
    if (commons.length === 0) {
      return `
      export type ${name}Interface =
        ${variantUnion};
    `;
    }

    return `
      export type ${name}Interface = {
        ${commons.join(";\n")}
      } & (
        ${variantUnion}
      );
    `;
  }
}
