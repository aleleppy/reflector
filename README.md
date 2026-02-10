# Svelte Reflector

**Turn your OpenAPI into a first‑class Svelte 5 DX.**

Svelte Reflector is a **developer‑experience–first code generator** that converts OpenAPI specs into fully typed, reactive Svelte 5 modules — ready for production, forms included.

[![npm version](https://img.shields.io/npm/v/svelte-reflector.svg)](https://www.npmjs.com/package/svelte-reflector)
[![npm downloads](https://img.shields.io/npm/dm/svelte-reflector.svg)](https://www.npmjs.com/package/svelte-reflector)
[![npm total downloads](https://img.shields.io/npm/dt/svelte-reflector.svg)](https://www.npmjs.com/package/svelte-reflector)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Svelte](https://img.shields.io/badge/Svelte-5+-orange.svg)](https://svelte.dev/)

A TypeScript code generator that creates type-safe Svelte 5 modules from OpenAPI specifications. It transforms your backend's OpenAPI/Swagger docs into fully-typed Svelte stores with built-in form handling, validation, and API integration.

## 🚀 Features

- **🔮 Automatic Type Generation** - Generates TypeScript interfaces and classes from OpenAPI schemas
- **⚡ Svelte 5 Runes Integration** - Uses `$state` for reactive state management
- **📝 Form Handling** - Auto-generates form schemas with validation support
- **🎯 Type-Safe API Calls** - Full TypeScript support for all API operations
- **🔌 OpenAPI/Swagger Compatible** - Works with any backend that exposes OpenAPI specs
- **🧪 Development Mode** - Smart regeneration based on environment
- **✅ Validation Ready** - Built-in support for custom field validators

## 📦 Installation

```bash
npm install svelte-reflector
# or
yarn add svelte-reflector
# or
pnpm add svelte-reflector
```

## 🏁 Quick Start

### 1. Configure Environment Variables

Create a `.env` file in your project root:

```env
# Required - Your backend URL
BACKEND_URL=https://api.example.com/
# or
PUBLIC_BACKEND=https://api.example.com/

# Optional - Environment (defaults to PROD)
ENVIRONMENT=DEV
# or
VITE_ENVIRONMENT=DEV
```

### 2. Create Reflector Config (Optional)

Create a `src/reflector.config.ts` to define custom validators:

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

### 3. Run the Generator

```bash
# Manual generation (recommended for DEV environment)
npx reflect

# Or programmatically
import { reflector } from "svelte-reflector";
await reflector(true); // true = force generation
```

### 4. Use Generated Modules

The generator creates files in `src/reflector/`:

```typescript
import { UserModule } from "$reflector/controllers/user/user.module.svelte";
import type { User } from "$reflector/schemas.svelte";

// Create module instance
const userModule = new UserModule();

// Access reactive state
console.log(userModule.loading); // $state<boolean>
console.log(userModule.list);    // $state<User[]>

// Call API methods
await userModule.listAll({
  onSuccess: (response) => console.log(response),
  onError: (error) => console.error(error),
});

// Work with forms
const userForm = userModule.forms.createUser;
userForm.name.value = "John Doe";
userForm.email.value = "john@example.com";

// Submit form
await userModule.createUser();
```

## 📁 Generated Structure

```
src/reflector/
├── controllers/
│   └── user/
│       └── user.module.svelte.ts    # API module with methods
├── schemas.svelte.ts                 # Generated schemas & types
├── reflector.svelte.ts              # Core utilities (build, isFormValid)
├── fields.ts                        # Field name constants
└── backup.json                      # Cached OpenAPI spec
```

## 🧩 Generated Module API

Each generated module provides:

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `loading` | `$state<boolean>` | Request loading state |
| `list` | `$state<T[]>` | List results (for list endpoints) |
| `forms` | `$state<Record<string, T>>` | Form instances |
| `querys` | `QueryParams` | Query parameter state |
| `headers` | `HeaderParams` | Header state |
| `paths` | `PathParams` | Path parameter state |

### Methods

```typescript
// List all items (GET with page parameter)
async listAll(behavior?: Behavior<ResponseType>): Promise<T[]>

// Get single entity (GET without page parameter)
async get(behavior?: Behavior<ResponseType>): Promise<T>

// Create/Update (POST/PUT/PATCH)
async create(behavior?: Behavior<ResponseType>): Promise<T>
async update(behavior?: Behavior<ResponseType>): Promise<T>

// Delete (DELETE)
async delete(behavior?: Behavior<ResponseType>): Promise<void>

// Form with auto-clear
async createAndClear(behavior?: Behavior<ResponseType>): Promise<T>

// Reset all state
reset(): void
```

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_URL` | ✅ | Backend API URL |
| `PUBLIC_BACKEND` | ✅ | Alternative to BACKEND_URL |
| `ENVIRONMENT` | ❌ | DEV/PROD (defaults to PROD) |
| `VITE_ENVIRONMENT` | ❌ | Vite-specific env var |
| `NODE_ENV` | ❌ | Node environment |

### Behavior Pattern

All API methods accept a `Behavior` object for callbacks:

```typescript
interface Behavior<TSuccess, TError> {
  onSuccess?: (value: TSuccess) => void;
  onError?: (error: TError) => void;
}

// Usage
await userModule.createUser({
  onSuccess: (user) => console.log("Created:", user),
  onError: (err) => console.error("Failed:", err),
});
```

### Form Validation

Forms use `BuildedInput` class with validation:

```typescript
interface BuildedInput<T> {
  value: T;           // Current value ($state)
  display: T;         // Display value ($state)
  required: boolean;  // Is field required
  placeholder: T;     // Placeholder/example value
  validator?: (v: T) => string | null; // Validation function
  validate(): string | null; // Run validation
}
```

## 🔧 TypeScript Configuration

Add path aliases to your `tsconfig.json`:

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

For Vite projects, also update `vite.config.ts`:

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

## 🔄 Workflow

### Development Mode

In `ENVIRONMENT=DEV`:
- Schemas are **NOT** auto-regenerated on build
- Use `npx reflect` to manually regenerate
- Faster builds, manual control

### Production Mode

In `ENVIRONMENT=PROD`:
- Schemas are auto-regenerated on each build
- Fresh types from latest OpenAPI spec
- Fallback to `backup.json` if backend is unavailable

## 🛠️ Advanced Usage

### Custom Validators

Define validators in `src/reflector.config.ts`:

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

Then implement in your app at `$lib/sanitizers/validateFormats.ts`:

```typescript
// Email validation
export function validateEmail(value: string): string | null {
  if (!value) return null; // Let required handle empty
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? null : "Invalid email format";
}

// Brazilian phone validation
export function validatePhone(value: string): string | null {
  if (!value) return null;
  const phoneRegex = /^(\+?55\s?)?(\(?\d{2}\)?\s?)?(\d{4,5}-?\d{4})$/;
  return phoneRegex.test(value) ? null : "Invalid phone number";
}

// CPF/CNPJ validation (Brazilian documents)
export function validateDocument(value: string): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return validateCPF(cleaned) ? null : "Invalid CPF";
  } else if (cleaned.length === 14) {
    return validateCNPJ(cleaned) ? null : "Invalid CNPJ";
  }
  return "Invalid document format";
}

function validateCPF(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(cpf[10]);
}

function validateCNPJ(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(cnpj[i]) * weights1[i];
  let rev = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (rev !== parseInt(cnpj[12])) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(cnpj[i]) * weights2[i];
  rev = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return rev === parseInt(cnpj[13]);
}

// Password strength validation
export function validatePassword(value: string): string | null {
  if (!value) return null;
  if (value.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(value)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(value)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(value)) return "Password must contain a number";
  if (!/[!@#$%^&*]/.test(value)) return "Password must contain a special character";
  return null;
}

// Date validation
export function validateDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return "Invalid date";
  if (date > new Date()) return "Date cannot be in the future";
  return null;
}

// Brazilian ZIP code (CEP) validation
export function validateZipcode(value: string): string | null {
  if (!value) return null;
  const cepRegex = /^\d{5}-?\d{3}$/;
  return cepRegex.test(value) ? null : "Invalid ZIP code format";
}

// URL validation
export function validateUrl(value: string): string | null {
  if (!value) return null;
  try {
    new URL(value);
    return null;
  } catch {
    return "Invalid URL format";
  }
}

// Min/max length validator factory
export function minLength(min: number) {
  return (value: string): string | null => {
    if (!value) return null;
    return value.length >= min ? null : `Must be at least ${min} characters`;
  };
}

export function maxLength(max: number) {
  return (value: string): string | null => {
    if (!value) return null;
    return value.length <= max ? null : `Must be at most ${max} characters`;
  };
}

// Number range validator factory
export function numberRange(min: number, max: number) {
  return (value: number): string | null => {
    if (value === null || value === undefined) return null;
    return value >= min && value <= max ? null : `Must be between ${min} and ${max}`;
  };
}

// Required field validator
export function required(value: string | number | boolean | null): string | null {
  if (value === null || value === undefined || value === '') {
    return "This field is required";
  }
  return null;
}
```

### Manual Schema Access

```typescript
import { User } from "$reflector/schemas.svelte";

// Create instance
const user = new User({ name: "John", email: "john@example.com" });

// Get data bundle
const data = user.bundle(); // { name: "John", email: "john@example.com" }
```

## 🐛 Troubleshooting

### "BACKEND_URL vazio" Error

Ensure you have set `BACKEND_URL` or `PUBLIC_BACKEND` in your `.env` file.

### Schemas Not Updating

In DEV mode, run `npx reflect` manually. Check that your backend's OpenAPI spec is accessible at `{BACKEND_URL}openapi.json`.

### Type Errors After Generation

1. Restart your TypeScript language server
2. Check path aliases in `tsconfig.json`
3. Ensure `$reflector/*` alias is configured

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🔗 Links

- [npm](https://www.npmjs.com/package/svelte-reflector)
- [GitHub](https://github.com/aleleppy/reflector)
- [Svelte](https://svelte.dev/)
- [OpenAPI Specification](https://swagger.io/specification/)

---

Built with 🦍 by the Pináculo Digital team.
