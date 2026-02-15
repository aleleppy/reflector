export interface ReflectorNamingConfig {
  /**
   * Nome da propriedade que contém as palavras a serem filtradas dos nomes.
   * @default "filterWords"
   */
  propertyName?: string;

  /**
   * Palavras que serão removidas dos nomes de entidades/módulos.
   * @default ["Get", "Res", "Default", "Dto", "Public"]
   */
  filterWords?: string[];
}

export interface ReflectorConfig {
  /**
   * Configurações de nomenclatura
   */
  naming?: ReflectorNamingConfig;
}
