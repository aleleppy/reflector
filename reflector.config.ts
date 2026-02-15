import type { ReflectorConfig } from "./src/config/types.js";

/**
 * Configuração do Reflector
 * 
 * Este arquivo permite personalizar o comportamento do gerador.
 * Coloque este arquivo na raiz do seu projeto.
 */
const config: ReflectorConfig = {
  /**
   * Configurações de nomenclatura
   */
  naming: {
    /**
     * Nome da propriedade que contém as palavras filtradas
     * (Usado internamente para referência)
     * @default "filterWords"
     */
    propertyName: "filterWords",

    /**
     * Palavras que serão removidas dos nomes de entidades/módulos
     * ao gerar os nomes.
     * 
     * Exemplo: "GetUserResponseDto" vira "user" se "Get", "Response", "Dto" estiverem na lista
     * 
     * @default ["Get", "Res", "Default", "Dto", "Public"]
     */
    filterWords: [
      "Get",
      // "Update",
      // "Close",
      // "Find",
      // "Change",
      // "List",
      // "Create",
      // "Response",
      "Res",
      // "Self",
      "Default",
      // "Repo",
      // "Formatted",
      "Dto",
      "Public",
    ],
  },
};

export default config;
