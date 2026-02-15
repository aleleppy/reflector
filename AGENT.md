# AGENT.md — Guia do Projeto (Svelte Reflector) 🍌🦍

Este arquivo documenta os **padrões de projeto e convenções** usados neste repositório.
A ideia é que outras IAs/leitores entendam **como o reflector funciona** antes de alterar qualquer coisa.

---

## 1) Descrição do Projeto

**Svelte Reflector** é uma biblioteca de geração de código que converte especificações **OpenAPI/Swagger** em módulos **Svelte 5** totalmente tipados e reativos.

### O que ele faz?
- 🔄 Converte schemas OpenAPI em classes TypeScript com runes do Svelte 5 (`$state`)
- 📝 Gera formulários com validação integrada
- 🌐 Cria clientes API tipados para todos os endpoints
- ⚡ Fornece gerenciamento de estado reativo para listagens, formulários e chamadas

### Público-alvo
Projetos frontend Svelte 5 que consomem APIs backend com OpenAPI (NestJS, FastAPI, etc.)

---

## 2) Stack Tecnológica

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Node.js** | >= 20 | Runtime |
| **TypeScript** | 5.9+ | Linguagem principal |
| **Axios** | ^1.12.2 | Cliente HTTP para fetch OpenAPI |
| **dotenv** | ^16.4.5 | Carregamento de variáveis de ambiente |

### Compilação
- **Target:** ES2022
- **Module:** NodeNext (ES Modules)
- **Output:** `dist/` com arquivos `.js` + `.d.ts`

---

## 3) Estrutura de Pastas

```
reflector/
├── src/                          # Código fonte
│   ├── cli.ts                    # Entry point CLI (npx reflect)
│   ├── index.ts                  # Exportação pública da lib
│   ├── main.ts                   # Classe principal Reflector
│   ├── generate-doc.ts           # Função principal de geração
│   ├── file.ts                   # Classe Source para manipulação de arquivos
│   ├── schema.ts                 # Classe Schema para processamento de schemas
│   ├── module.ts                 # Classe Module para agrupar métodos
│   ├── vars.global.ts            # Variáveis globais (paths)
│   │
│   ├── core/                     # Analisadores e builders de métodos
│   │   ├── Method.ts             # Classe base Method
│   │   ├── MethodBuilder.ts      # Builder para construir métodos
│   │   ├── MethodRequestAnalyzer.ts   # Analisa request parameters
│   │   ├── MethodResponseAnalyzer.ts  # Analisa responses
│   │   ├── MethodEndpointBuilder.ts   # Constrói endpoints
│   │   ├── MethodApiTypeAnalyzer.ts   # Analisa tipos de API
│   │   ├── MethodBodyAnalyzer.ts      # Analisa body da requisição
│   │   └── index.ts              # Exportações do core
│   │
│   ├── generators/               # Geradores de código
│   │   ├── ModuleGenerator.ts    # Gera código de módulos
│   │   ├── MethodGenerator.ts    # Gera código de métodos
│   │   ├── MethodApiCallBuilder.ts    # Builder de chamadas API
│   │   ├── MethodPropsBuilder.ts      # Builder de propriedades
│   │   ├── QueryBuilderGenerator.ts   # Gera query builders
│   │   ├── ReflectorFileGenerator.ts  # Gera arquivo reflector.svelte.ts
│   │   ├── ReflectorClasses.ts        # Classes auxiliares do reflector
│   │   ├── ReflectorFunctions.ts      # Funções auxiliares
│   │   ├── ReflectorTypes.ts          # Tipos auxiliares
│   │   └── index.ts              # Exportações
│   │
│   ├── models/                   # Modelos de propriedades
│   │   ├── Property.ts           # Classe base Property (abstract)
│   │   ├── PrimitiveProperty.ts  # Propriedades primitivas (string, number, etc)
│   │   ├── ObjectProperty.ts     # Propriedades objeto
│   │   ├── ArrayProperty.ts      # Propriedades array
│   │   ├── EnumProperty.ts       # Propriedades enum
│   │   ├── EnumClass.ts          # Classe para enums
│   │   ├── PropertyBuilder.ts    # Builder de propriedades
│   │   └── index.ts              # Exportações
│   │
│   ├── types/                    # Tipos TypeScript
│   │   ├── open-api-spec.interface.ts  # Interfaces OpenAPI
│   │   └── types.ts              # Tipos gerais do projeto
│   │
│   ├── utils/                    # Utilitários
│   │   ├── NamingUtils.ts        # Funções de naming (extractModuleName, etc)
│   │   ├── StringUtils.ts        # Manipulação de strings
│   │   ├── SchemaUtils.ts        # Utilitários de schema
│   │   ├── EndpointUtils.ts      # Utilitários de endpoint
│   │   ├── FileUtils.ts          # Utilitários de arquivo
│   │   ├── EnumUtils.ts          # Utilitários de enum
│   │   ├── ValidatorUtils.ts     # Utilitários de validação
│   │   └── index.ts              # Exportações
│   │
│   ├── helpers/                  # Helpers auxiliares
│   │   ├── helpers.ts            # Funções helper gerais
│   │   └── generate-doc.helper.ts # Helpers específicos de geração
│   │
│   └── props/                    # (pasta vazia - reservada)
│
├── dist/                         # Código compilado (não commitar)
├── package.json                  # Configuração do pacote npm
├── tsconfig.json                 # Configuração TypeScript
├── README.md                     # Documentação do usuário
└── .gitignore                    # Arquivos ignorados pelo git
```

---

## 4) Convenções de Código

### 4.1 Nomenclatura de Arquivos

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Classes principais | `PascalCase.ts` | `Reflector.ts`, `Method.ts` |
| Builders | `PascalCaseBuilder.ts` | `MethodBuilder.ts` |
| Analisadores | `PascalCaseAnalyzer.ts` | `MethodRequestAnalyzer.ts` |
| Utilitários | `PascalCaseUtils.ts` | `NamingUtils.ts` |
| Interfaces | `*.interface.ts` | `open-api-spec.interface.ts` |
| Index files | `index.ts` | `core/index.ts` |

### 4.2 Nomenclatura de Classes

| Elemento | Padrão | Exemplo |
|----------|--------|---------|
| Classes | `PascalCase` | `class Reflector`, `class Method` |
| Métodos públicos | `camelCase` | `generate()`, `build()` |
| Métodos privados | `camelCase` prefixado | `private clearSrc()` |
| Propriedades | `camelCase` | `components`, `paths` |
| Propriedades readonly | `camelCase` (readonly) | `readonly localDoc` |
| Abstract classes | `PascalCase` | `abstract class Property` |

### 4.3 Padrão de Importação

- **Sempre usar extensão `.js`** nas importações (ES Modules):
```typescript
// ✅ Correto
import { Reflector } from "./main.js";
import { Method } from "./core/Method.js";

// ❌ Incorreto
import { Reflector } from "./main";
```

### 4.4 Estrutura de Classes

**Classe abstrata base (Property):**
```typescript
export abstract class Property {
  name: string;
  required: boolean;
  isParam: boolean;
  isNullable: boolean;
  isSpecial: boolean = false;

  constructor(params: { name: string; required: boolean; isParam?: boolean; isNullable?: boolean }) {
    this.name = this.treatName(params.name);
    this.required = params.required;
    this.isParam = params.isParam ?? false;
    this.isNullable = params.isNullable ?? false;
  }

  protected thisDot(): string { /* ... */ }

  // Métodos abstratos que subclasses devem implementar
  abstract generateConstructor(): string;
  abstract generateClassProperty(): string;
  abstract generateInterfaceProperty(): string;
  abstract generateBundleCode(): string;
}
```

### 4.5 Padrão de Builders

Builders usam padrão fluent/composição:
```typescript
export class MethodBuilder {
  private method: Method;

  constructor(method: Method) {
    this.method = method;
  }

  // Métodos que constroem partes
  buildImports(): string { /* ... */ }
  buildState(): string { /* ... */ }
  buildMethods(): string { /* ... */ }

  // Método final de construção
  build(): string {
    return [
      this.buildImports(),
      this.buildState(),
      this.buildMethods(),
    ].join("\n");
  }
}
```

### 4.6 Map/Set para Agrupamento

Usar `Map` e `Set` para agrupar dados:
```typescript
const methodsMap = new Map<string, Info>();
const propertiesNames = new Set<string>();
```

### 4.7 Enum Types Global

Map global para tipos enum (compartilhado entre arquivos):
```typescript
// src/main.ts
export const enumTypes = new Map<string, string>();
```

---

## 5) Como Rodar o Projeto

### 5.1 Instalação de Dependências

```bash
cd /home/node/.openclaw/workspace/reflector
npm install
```

### 5.2 Build

```bash
# Compilar TypeScript para dist/
npm run build
```

### 5.3 Testar CLI Localmente

```bash
# Após build, pode testar o CLI
node dist/cli.js
# ou
npx reflect
```

### 5.4 Uso em Outro Projeto

1. Instalar o pacote:
```bash
npm install svelte-reflector
```

2. Configurar variáveis de ambiente (`.env`):
```env
BACKEND_URL=https://api.exemplo.com/
ENVIRONMENT=DEV
```

3. Executar:
```bash
npx reflect
```

---

## 6) Comandos Úteis

### NPM Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run build` | Compila TypeScript para `dist/` |

### CLI

| Comando | Descrição |
|---------|-----------|
| `npx reflect` | Gera/refresca os schemas a partir do OpenAPI |

### Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `BACKEND_URL` | ✅ | URL do backend com OpenAPI |
| `PUBLIC_BACKEND` | ✅ (alternativa) | Alternativa ao BACKEND_URL |
| `ENVIRONMENT` | ❌ | DEV/PROD (padrão: PROD) |
| `VITE_ENVIRONMENT` | ❌ | Alternativa Vite |
| `NODE_ENV` | ❌ | Alternativa Node |

### Comportamento por Ambiente

- **DEV**: Schemas NÃO são regenerados automaticamente. Use `npx reflect` manualmente.
- **PROD**: Schemas são regenerados automaticamente em cada build.

---

## 7) Arquitetura Interna

### Fluxo de Geração

```
1. CLI (cli.ts)
   ↓
2. reflector() (generate-doc.ts)
   ↓ (fetch OpenAPI spec)
3. Reflector class (main.ts)
   ↓
4. Module[] - agrupa por controller
   ↓
5. Schema[] - processa component schemas
   ↓
6. Generators (generators/)
   ↓
7. Source.save() - escreve arquivos em src/reflector/
```

### Classes Principais

| Classe | Responsabilidade |
|--------|------------------|
| `Reflector` | Orquestra todo o processo de geração |
| `Module` | Representa um controller/API module |
| `Method` | Representa um endpoint HTTP |
| `Schema` | Representa um schema OpenAPI |
| `Property` | Representa uma propriedade de schema (abstrata) |
| `Source` | Manipula leitura/escrita de arquivos |

---

## 8) Regras Práticas para Contribuir

1. **Sempre use `.js` nas importações** - É ES Module, não CommonJS.

2. **Mantenha a consistência de naming** - PascalCase para classes/arquivos, camelCase para métodos.

3. **Atualize os index.ts** - Sempre exporte novas classes no index.ts da pasta.

4. **Teste o CLI após alterações**:
   ```bash
   npm run build
   node dist/cli.js
   ```

5. **Cuidado com o enumTypes global** - É um Map compartilhado, não reinicialize sem necessidade.

6. **Propriedades abstratas** - Se criar novo tipo de Property, implemente todos os métodos abstratos.

7. **Builders devem ser puramente string builders** - Não devem ter side effects, apenas retornar código.

---

## 9) Cheatsheet de Arquivos Importantes

| Arquivo | Propósito |
|---------|-----------|
| `src/cli.ts` | Entry point do comando `npx reflect` |
| `src/index.ts` | Exportação pública da biblioteca |
| `src/generate-doc.ts` | Função `reflector()` principal |
| `src/main.ts` | Classe `Reflector` - orquestrador |
| `src/file.ts` | Classe `Source` - I/O de arquivos |
| `src/schema.ts` | Classe `Schema` - processa schemas OpenAPI |
| `src/module.ts` | Classe `Module` - agrupa métodos por controller |
| `src/vars.global.ts` | Paths globais (baseDir, generatedDir) |
| `src/core/Method.ts` | Classe base para endpoints |
| `src/models/Property.ts` | Classe abstrata para propriedades |

---

## 10) Publicação (npm)

O pacote é publicado como `svelte-reflector` no npm.

```bash
# Atualizar versão
npm version patch|minor|major

# Publicar
npm publish
```

Arquivos incluídos no pacote (package.json `files`):
- `dist/` apenas

Entry points:
- Main: `./dist/index.js`
- Types: `./dist/index.d.ts`
- CLI: `./dist/cli.js` (bin `reflect`)
