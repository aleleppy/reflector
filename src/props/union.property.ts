import { isReferenceObject } from "../helpers/helpers.js";
import { inlineType } from "../helpers/inline-type.js";
import type {
  DiscriminatorObject,
  ReferenceObject,
  SchemaObject,
} from "../types/open-api-spec.interface.js";

/**
 * Property whose OpenAPI schema is a `oneOf` — a union of `$ref`ed component
 * schemas (optionally carrying a `discriminator`) and/or inline members
 * (`{ type: "string" }`, enums, arrays, free-form maps — see `inlineType`).
 *
 * Also models a free-form map property (`additionalProperties`), which is the
 * same thing at runtime — a raw passthrough value — typed as the one-member
 * union `Record<string, T>` (see `UnionProp.forMap`).
 *
 * Runtime model is intentionally flat/passthrough: the class field stores the
 * raw incoming object typed as the union of the variants' `Interface`s — there
 * is no `new` (you can't instantiate a union) and no `.bundle()` on it
 * (`bundleStrict`/`bundleInputs` pass plain objects through unchanged). The
 * elegant discriminated narrowing lives in the schema's `Interface` type alias
 * (see `DiscriminatedInterfaceRenderer`), not on the live class instance.
 */
export class UnionProp {
  name: string;
  /** Variant component names extracted from each `oneOf` `$ref` (deduped, order-preserving). */
  readonly variantTypes: string[];
  /** TS types of the inline (non-`$ref`) members, e.g. `string`, `number` (deduped, order-preserving). */
  readonly inlineTypes: string[];
  /** Every component schema whose `Interface` the field type references (variants + refs nested in inline members). */
  readonly schemaRefs: string[];
  readonly discriminator: DiscriminatorObject | undefined;

  private readonly required: boolean;
  private readonly isNullable: boolean;

  constructor(params: {
    name: string;
    oneOf: (SchemaObject | ReferenceObject)[];
    discriminator?: DiscriminatorObject | undefined;
    isRequired?: boolean;
    isNullable?: boolean | undefined;
  }) {
    const { name, oneOf, discriminator, isRequired, isNullable } = params;

    this.name = name;
    this.discriminator = discriminator;
    this.required = isRequired ?? true;
    this.isNullable = !!isNullable;

    const refs = oneOf
      .filter(isReferenceObject)
      .map((ref) => ref.$ref.split("/").at(-1) ?? "")
      .filter(Boolean);
    this.variantTypes = [...new Set(refs)];
    const inline = oneOf.filter((member) => !isReferenceObject(member)).map(inlineType);
    this.inlineTypes = [...new Set(inline.map((member) => member.type))];
    this.schemaRefs = [...new Set([...this.variantTypes, ...inline.flatMap((member) => member.refs)])];
  }

  /** Free-form map property (`additionalProperties`): a passthrough typed `Record<string, T>`. */
  static forMap(params: {
    name: string;
    schemaObject: SchemaObject;
    isRequired: boolean;
    isNullable?: boolean | undefined;
  }): UnionProp {
    const { name, schemaObject, isRequired, isNullable } = params;
    return new UnionProp({ name, oneOf: [{ ...schemaObject, nullable: false }], isRequired, isNullable });
  }

  /** `AInterface | BInterface | string | ...` — the flat union used for the class field type. */
  flatUnion(): string {
    const members = [...this.variantTypes.map((t) => `${t}Interface`), ...this.inlineTypes];
    return members.length ? members.join(" | ") : "unknown";
  }

  /** True when this union can render as a discriminated `Interface` (needs a mapping). */
  get hasDiscriminator(): boolean {
    return !!this.discriminator?.mapping && Object.keys(this.discriminator.mapping).length > 0;
  }

  classBuild() {
    const req = this.required ? "" : "?";
    const nullable = this.isNullable ? " | null" : "";
    // No `new` for a union — `$state<T>()` (no arg) yields `T | undefined`,
    // populated by the constructor from the incoming data.
    return `${this.name}${req} = $state<${this.flatUnion()}${nullable}>()`;
  }

  constructorBuild() {
    return `this.${this.name} = params?.data?.${this.name}`;
  }

  bundleBuild() {
    return `${this.name}: this.${this.name}`;
  }

  interfaceBuild() {
    const req = this.required ? "" : "?";
    const nullable = this.isNullable ? " | null" : "";
    return `${this.name}${req}: ${this.flatUnion()}${nullable}`;
  }

  hydrateBuild() {
    return `if (data.${this.name} !== undefined) this.${this.name} = data.${this.name}`;
  }
}
