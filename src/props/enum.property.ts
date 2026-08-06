import { splitByUppercase, treatByUppercase } from "../helpers/helpers.js";
import type { CodegenContext } from "../core/CodegenContext.js";

/** Hash determinístico e curto de um value-set, para desempatar colisão de nome
 *  de enum sem depender da ordem em que os schemas foram varridos. */
function fnv1aBase36(input: string): string {
  let hash = 0x81_1c_9d_c5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01_00_01_93) >>> 0;
  }
  return hash.toString(36).toUpperCase();
}

export class EnumProp {
  name: string;
  isParam: boolean;
  readonly type: string;
  enumName: string;

  private readonly isRequired: boolean;
  private readonly example: string;

  constructor(params: {
    name: string;
    enums: string[];
    required: boolean;
    isParam: boolean | undefined;
    entityName: string;
    context: CodegenContext;
  }) {
    const { name, required, isParam, enums, entityName, context } = params;

    this.name = name;
    this.isParam = !!isParam;
    this.isRequired = required;

    this.type = enums.map((e) => `'${e}'`).join(",");

    this.example = enums[0] as string;
    this.enumName = EnumProp.resolveName({ entityName, propName: this.name, literals: this.type, context });
  }

  /**
   * Nome estável do enum gerado, derivado SEMPRE do schema que declara o campo.
   *
   * O gerador antigo deduplicava por conjunto de valores e nomeava pelo primeiro
   * schema varrido — um schema novo no back que reusasse os mesmos valores
   * renomeava o export existente (`ENUM_TENANT_ADDRESS_STATE` virando
   * `ENUM_MUNICIPALITY_BACK_OFFICE_STATE`). Aqui o nome não depende de ordem.
   *
   * Regra, em 3 tiers determinísticos:
   * 1. `ENUM_<ENTIDADE_TRATADA>_<PROP>`. Se o nome estiver livre, ou já registrado
   *    com o MESMO conjunto de valores, é ele (idempotente).
   * 2. Colisão real (mesmo nome, conjunto diferente): re-deriva a partir do nome
   *    cru da entidade, sem strip de trash-words e sem dedup de segmentos —
   *    desempata o caso comum (`UserRes` e `UserDto` colapsando em `user`).
   * 3. Se ainda colidir, sufixo com hash FNV-1a dos literais em base36. Depende
   *    só do value-set, então continua independente de ordem de varredura.
   *
   * Ressalva conhecida: no tier 2/3 (colisão de NOME com valores diferentes),
   * qual dos dois donos fica com o nome curto depende de quem foi varrido antes.
   * É um caso raro e pré-existente — antes ele emitia dois `export const` com o
   * mesmo nome, ou seja, `enums.ts` que nem compilava. O bug reportado (schema
   * novo reusando um value-set existente) é o tier 1 e esse é 100% estável.
   */
  private static resolveName(params: {
    entityName: string;
    propName: string;
    literals: string;
    context: CodegenContext;
  }): string {
    const { entityName, propName, literals, context } = params;

    const claim = (candidate: string): string | null => {
      const existing = context.enumTypes.get(candidate);
      if (existing === undefined) {
        context.enumTypes.set(candidate, literals);
        return candidate;
      }
      return existing === literals ? candidate : null;
    };

    const segments = splitByUppercase(treatByUppercase(entityName)).map((x) => x.toUpperCase());
    const treated = `ENUM_${segments.join("_")}_${propName.toUpperCase()}`.split("_");
    const tier1 = [...new Set(treated)].join("_");

    const rawSegments = splitByUppercase(entityName)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean);
    const tier2 = `ENUM_${rawSegments.join("_")}_${propName.toUpperCase()}`;

    const tier3 = `${tier1}_${fnv1aBase36(literals)}`;

    return claim(tier1) ?? claim(tier2) ?? claim(tier3) ?? tier3;
  }

  classBuild() {
    const req = this.isRequired ? "" : "?";

    return `${this.name}${req}: BuildedInput<${this.enumName}>`;
  }

  constructorBuild() {
    return `this.${this.name} = build({ key: params?.data?.${this.name}, placeholder: '${this.example}', example: '${this.example}', required: ${this.isRequired}})`;
  }

  interfaceBuild() {
    const req = this.isRequired ? "" : "?";

    return `${this.name}${req}: ${this.enumName}`;
  }

  queryBuild() {
    return `readonly ${this.name} = new QueryBuilder({ key: '${this.name}' })`;
  }

  bundleBuild() {
    return `${this.name}: this.${this.name}?.value`;
  }

  hydrateBuild() {
    const opt = this.isRequired ? "" : "?";
    return `if (data.${this.name} !== undefined) this.${this.name}${opt}.hydrate(data.${this.name} as never)`;
  }
}
