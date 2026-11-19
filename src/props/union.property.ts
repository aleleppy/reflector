import { isReferenceObject } from "../helpers/helpers.js";
import type {
  DiscriminatorObject,
  ReferenceObject,
  SchemaObject,
} from "../types/open-api-spec.interface.js";

const PRIMITIVE_TS_TYPES: Record<string, string> = {
  string: "string",
  number: "number",
  integer: "number",
  boolean: "boolean",
};

/** TS type of an inline (non-`$ref`) `oneOf` member; `unknown` when it has no primitive shape. */
function inlineMemberType(member: SchemaObject | ReferenceObject): string {
  if (isReferenceObject(member)) return `${member.$ref.split("/").at(-1) ?? "unknown"}Interface`;

  const nullable = member.nullable ? " | null" : "";

  if (member.enum?.length) {
    return member.enum.map((value) => JSON.stringify(value)).join(" | ") + nullable;
  }
  if (member.type === "array") {
    const item = member.items ? inlineMemberType(member.items) : "unknown";
    return `(${item})[]${nullable}`;
  }

  const primitive = member.type ? PRIMITIVE_TS_TYPES[member.type] : undefined;
  return (primitive ?? "unknown") + nullable;
}

/**
 * Property whose OpenAPI schema is a `oneOf` — a union of `$ref`ed component
 * schemas (optionally carrying a `discriminator`) and/or inline primitive
 * members (`{ type: "string" }`, enums, arrays of those). Inline object members
 * aren't promoted to their own schema: they fall back to `unknown`.
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
    this.inlineTypes = [...new Set(oneOf.filter((member) => !isReferenceObject(member)).map(inlineMemberType))];
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
