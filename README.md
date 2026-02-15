<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Svelte_Logo.svg/199px-Svelte_Logo.svg.png" width="80" alt="Svelte Logo" />
</p>

<p align="center">
  <strong>🦍 Svelte Reflector</strong><br>
  Turn your OpenAPI into a first-class Svelte 5 DX
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/svelte-reflector">
    <img src="https://img.shields.io/npm/v/svelte-reflector.svg?style=flat&color=cb3837" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/svelte-reflector">
    <img src="https://img.shields.io/npm/dm/svelte-reflector.svg?style=flat&color=cb3837" alt="npm downloads" />
  </a>
  <img src="https://img.shields.io/badge/TypeScript-5.9+-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Svelte-5+-FF3E00?style=flat&logo=svelte&logoColor=white" alt="Svelte 5" />
  <img src="https://img.shields.io/badge/OpenAPI-3.0-6BA539?style=flat&logo=swagger&logoColor=white" alt="OpenAPI" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=nodedotjs&logoColor=white" alt="Node.js" />
</p>

---

## 📖 Introdução

O **Svelte Reflector** é um **gerador de código focado em DX (Developer Experience)** que converte especificações OpenAPI em módulos Svelte 5 totalmente tipados e reativos — prontos para produção, com formulários inclusos.

Desenvolvido pela [Pináculo Digital](https://pinaculodigital.com.br), este package transforma a documentação OpenAPI/Swagger do seu backend em stores Svelte com manipulação de formulários, validação e integração de API integradas.

### 🎯 Para que serve?

- **Projetos Svelte 5** que consomem APIs RESTful documentadas com OpenAPI
- **Aplicações que precisam de formulários tipados** gerados automaticamente
- **Times que querem eliminar o boilerplate** de integração com APIs
- **Projetos que precisam de type-safety** entre frontend e backend
- **Desenvolvimento ágil** com geração automática de código a partir do backend

---

## 🚀 Pré-requisitos

Antes de começar, certifique-se de ter:

| Requisito | Versão | Descrição |
|-----------|--------|-----------|
| Node.js | 20+ | Runtime JavaScript |
| npm/yarn/pnpm | - | Gerenciador de pacotes |
| Svelte | 5+ | Framework frontend |
| TypeScript | 5.9+ | Superset tipado |
| Backend com OpenAPI | 3.0+ | API documentada com Swagger/OpenAPI |

---

## 📦 Instalação

```bash
# npm
npm install svelte-reflector

# yarn
yarn add svelte-reflector

# pnpm
pnpm add svelte-reflector
```

---

## 🏁 Quick Start

### 1. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Obrigatório - URL do backend
BACKEND_URL=https://api.exemplo.com/
# ou
PUBLIC_BACKEND=https://api.exemplo.com/

# Opcional - Ambiente (padrão: PROD)
ENVIRONMENT=DEV
# ou
VITE_ENVIRONMENT=DEV
```

### 2. Criar Configuração do Reflector (Opcional)

Crie `src/reflector.config.ts` para definir validadores customizados:

```typescript
export const validators = [
  {
    fields: ["email", "userEmail"],
    validator: "validateEmail",
  },
  {
    fields: ["phone", "mobile"],
    validator: "validatePhone",
  },
  {
    fields: ["cpf", "cnpj"],
    validator: "validateDocument",
  },
];
```

### 3. Executar o Gerador

```bash
# Geração manual (recomendado para DEV)
npx reflect

# Ou programaticamente
import { reflector } from "svelte-reflector";
await reflector(true); // true = forçar geração
```

### 4. Usar os Módulos Gerados

O gerador cria arquivos em `src/reflector/`:

```typescript
import { UserModule } from "$reflector/controllers/user/user.module.svelte";
import type { User } from "$reflector/schemas.svelte";

// Criar instância do módulo
const userModule = new UserModule();

// Acessar estado reativo
console.log(userModule.loading); // $state<boolean>
console.log(userModule.list);    // $state<User[]>

// Chamar métodos da API
await userModule.listAll({
  onSuccess: (response) => console.log(response),
  onError: (error) => console.error(error),
});

// Trabalhar com formulários
const userForm = userModule.forms.createUser;
userForm.name.value = "João Silva";
userForm.email.value = "joao@exemplo.com";

// Submeter formulário
await userModule.createUser();
```

---

## 🏗️ Estrutura do Projeto

### Estrutura Gerada

```
src/reflector/
├── controllers/
│   └── [nome-controller]/
│       └── [nome].module.svelte.ts    # Módulo de API com métodos
├── schemas.svelte.ts                   # Schemas e tipos gerados
├── reflector.svelte.ts                # Utilitários core (build, isFormValid)
├── fields.ts                          # Constantes de nomes de campos
└── backup.json                        # Cache da spec OpenAPI
```

### Estrutura do Package

```
svelte-reflector/
├── src/
│   ├── core/                # Núcleo do gerador
│   │   └── index.ts
│   ├── generators/          # Geradores de código
│   │   ├── index.ts
│   │   ├── module.generator.ts
│   │   └── schema.generator.ts
│   ├── helpers/             # Funções auxiliares
│   │   └── index.ts
│   ├── models/              # Modelos de dados
│   │   ├── index.ts
│   │   ├── field.model.ts
│   │   └── method.model.ts
│   ├── types/               # Tipos TypeScript
│   │   └── index.ts
│   ├── utils/               # Utilitários
│   │   └── index.ts
│   ├── cli.ts               # Entry point CLI
│   ├── index.ts             # Entry point principal
│   ├── main.ts              # Lógica principal
│   ├── reflector.ts         # Configuração do reflector
│   ├── schema.ts            # Processamento de schemas
│   ├── module.ts            # Geração de módulos
│   ├── method.ts            # Processamento de métodos
│   ├── request.ts           # Geração de requests
│   ├── interface.ts         # Interfaces do sistema
│   ├── enum.class.ts        # Enums e classes
│   ├── file.ts              # Utilitários de arquivo
│   └── vars.global.ts       # Variáveis globais
├── dist/                    # Código compilado
├── package.json
├── tsconfig.json
└── README.md
```

---

## ✨ Funcionalidades Principais

### 🔮 Geração Automática de Tipos
- Gera interfaces TypeScript a partir de schemas OpenAPI
- Type-safe em todas as operações de API
- Autocomplete inteligente no IDE

### ⚡ Integração com Svelte 5 Runes
- Usa `$state` para gerenciamento reativo de estado
- Compatível com runes do Svelte 5
- Reactividade nativa sem boilerplate

### 📝 Formulários Gerados Automaticamente
- Schemas de formulário com suporte a validação
- Campos tipados com valores, placeholders e validadores
- Suporte a validação customizada por campo

### 🔌 Compatível com OpenAPI/Swagger
- Funciona com qualquer backend que exponha OpenAPI
- Suporte a OpenAPI 3.0+
- Cache local da especificação (backup.json)

### 🧪 Modo Desenvolvimento Inteligente
- Regeneração inteligente baseada no ambiente
- Em DEV: regeneração manual para builds mais rápidos
- Em PROD: regeneração automática em cada build

### ✅ Validação Pronta para Uso
- Suporte integrado a validadores customizados
- Validação de email, telefone, CPF/CNPJ, senha, etc.
- Fácil extensão com novos validadores

---

## 🛠️ Stack Tecnológica

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| TypeScript | 5.9+ | Linguagem principal |
| Svelte | 5+ | Framework frontend alvo |
| Node.js | 20+ | Runtime e CLI |
| Axios | 1.12+ | Cliente HTTP para fetch OpenAPI |
| OpenAPI | 3.0+ | Especificação de API |

---

## 📚 API dos Módulos Gerados

### Propriedades de Estado

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `loading` | `$state<boolean>` | Estado de carregamento da requisição |
| `list` | `$state<T[]>` | Resultados de listagem (endpoints com page) |
| `forms` | `$state<Record<string, T>>` | Instâncias de formulários |
| `querys` | `QueryParams` | Estado dos parâmetros de query |
| `headers` | `HeaderParams` | Estado dos headers |
| `paths` | `PathParams` | Estado dos parâmetros de path |

### Métodos Disponíveis

```typescript
// Listar todos (GET com page)
async listAll(behavior?: Behavior<ResponseType>): Promise<T[]>

// Obter entidade única (GET sem page)
async get(behavior?: Behavior<ResponseType>): Promise<T>

// Criar/Atualizar (POST/PUT/PATCH)
async create(behavior?: Behavior<ResponseType>): Promise<T>
async update(behavior?: Behavior<ResponseType>): Promise<T>

// Deletar (DELETE)
async delete(behavior?: Behavior<ResponseType>): Promise<void>

// Formulário com auto-limpeza
async createAndClear(behavior?: Behavior<ResponseType>): Promise<T>

// Resetar todo o estado
reset(): void
```

---

## ⚙️ Configuração Avançada

### Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `BACKEND_URL` | ✅ | URL da API backend |
| `PUBLIC_BACKEND` | ✅ | Alternativa ao BACKEND_URL |
| `ENVIRONMENT` | ❌ | DEV/PROD (padrão: PROD) |
| `VITE_ENVIRONMENT` | ❌ | Variável específica do Vite |
| `NODE_ENV` | ❌ | Ambiente Node.js |

### Padrão Behavior

Todos os métodos de API aceitam um objeto `Behavior` para callbacks:

```typescript
interface Behavior<TSuccess, TError> {
  onSuccess?: (value: TSuccess) => void;
  onError?: (error: TError) => void;
}

// Uso
await userModule.createUser({
  onSuccess: (user) => console.log("Criado:", user),
  onError: (err) => console.error("Erro:", err),
});
```

### Validação de Formulários

Os formulários usam a classe `BuildedInput` com validação:

```typescript
interface BuildedInput<T> {
  value: T;                    // Valor atual ($state)
  display: T;                  // Valor de exibição ($state)
  required: boolean;           // Campo obrigatório
  placeholder: T;              // Placeholder/valor exemplo
  validator?: (v: T) => string | null; // Função de validação
  validate(): string | null;  // Executar validação
}
```

---

## 🔧 Configuração TypeScript

Adicione aliases de path ao `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "$reflector/*": ["./src/reflector/*"],
      "$lib/*": ["./src/lib/*"]
    }
  }
}
```

Para projetos Vite, atualize também o `vite.config.ts`:

```typescript
export default defineConfig({
  resolve: {
    alias: {
      $reflector: path.resolve("./src/reflector"),
      $lib: path.resolve("./src/lib"),
    },
  },
});
```

---

## 🔄 Fluxo de Trabalho

### Modo Desenvolvimento (DEV)

- Schemas **NÃO** são regenerados automaticamente no build
- Use `npx reflect` para regenerar manualmente
- Builds mais rápidos, controle manual

### Modo Produção (PROD)

- Schemas são regenerados automaticamente em cada build
- Tipos atualizados da última spec OpenAPI
- Fallback para `backup.json` se backend estiver indisponível

---

## 🛡️ Validação Customizada

### Configuração de Validadores

Defina validadores em `src/reflector.config.ts`:

```typescript
export const validators = [
  {
    fields: ["email", "userEmail", "contactEmail"],
    validator: "validateEmail",
  },
  {
    fields: ["phone", "mobile", "whatsapp"],
    validator: "validatePhone",
  },
  {
    fields: ["cpf", "cnpj", "document"],
    validator: "validateDocument",
  },
  {
    fields: ["password", "newPassword"],
    validator: "validatePassword",
  },
  {
    fields: ["birthDate", "startDate", "endDate"],
    validator: "validateDate",
  },
  {
    fields: ["zipcode", "cep"],
    validator: "validateZipcode",
  },
  {
    fields: ["url", "website", "avatarUrl"],
    validator: "validateUrl",
  },
];
```

### Implementação dos Validadores

Implemente em `$lib/sanitizers/validateFormats.ts`:

```typescript
// Validação de email
export function validateEmail(value: string): string | null {
  if (!value) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? null : "Formato de email inválido";
}

// Validação de telefone brasileiro
export function validatePhone(value: string): string | null {
  if (!value) return null;
  const phoneRegex = /^(\+?55\s?)?(\(?\d{2}\)?\s?)?(\d{4,5}-?\d{4})$/;
  return phoneRegex.test(value) ? null : "Telefone inválido";
}

// Validação de CPF/CNPJ
export function validateDocument(value: string): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return validateCPF(cleaned) ? null : "CPF inválido";
  } else if (cleaned.length === 14) {
    return validateCNPJ(cleaned) ? null : "CNPJ inválido";
  }
  return "Formato de documento inválido";
}

// Força da senha
export function validatePassword(value: string): string | null {
  if (!value) return null;
  if (value.length < 8) return "Mínimo 8 caracteres";
  if (!/[A-Z]/.test(value)) return "Precisa de letra maiúscula";
  if (!/[a-z]/.test(value)) return "Precisa de letra minúscula";
  if (!/[0-9]/.test(value)) return "Precisa de número";
  if (!/[!@#$%^&*]/.test(value)) return "Precisa de caractere especial";
  return null;
}
```

---

## 🐛 Solução de Problemas

### Erro "BACKEND_URL vazio"

Certifique-se de ter configurado `BACKEND_URL` ou `PUBLIC_BACKEND` no arquivo `.env`.

### Schemas não atualizam

No modo DEV, execute `npx reflect` manualmente. Verifique se a spec OpenAPI está acessível em `{BACKEND_URL}openapi.json`.

### Erros de tipo após geração

1. Reinicie o servidor de linguagem TypeScript
2. Verifique os aliases de path no `tsconfig.json`
3. Confirme que o alias `$reflector/*` está configurado

---

## 🤝 Como Contribuir

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🔗 Links

- [npm](https://www.npmjs.com/package/svelte-reflector)
- [GitHub](https://github.com/aleleppy/reflector)
- [Svelte](https://svelte.dev/)
- [OpenAPI Specification](https://swagger.io/specification/)

---

<p align="center">
  Desenvolvido com 🦍 pela equipe <a href="https://pinaculodigital.com.br">Pináculo Digital</a>
</p>
