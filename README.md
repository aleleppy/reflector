# Svelte Reflector

**Turn your OpenAPI into a first-class Svelte 5 DX.**

Svelte Reflector is a **developer-experience-first code generator** that converts OpenAPI specs into fully typed, reactive Svelte 5 modules — ready for production, forms included.

[![npm version](https://img.shields.io/npm/v/svelte-reflector.svg)](https://www.npmjs.com/package/svelte-reflector)
[![npm downloads](https://img.shields.io/npm/dm/svelte-reflector.svg)](https://www.npmjs.com/package/svelte-reflector)
[![npm total downloads](https://img.shields.io/npm/dt/svelte-reflector.svg)](https://www.npmjs.com/package/svelte-reflector)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Svelte](https://img.shields.io/badge/Svelte-5+-orange.svg)](https://svelte.dev/)

## Features

- **Automatic Type Generation** - Generates TypeScript interfaces and classes from OpenAPI schemas
- **Svelte 5 Runes Integration** - Uses `$state` and `$derived` for reactive state management
- **Abstract Modules** - Generated modules are abstract classes, ready to be extended with custom logic
- **Per-Module Schemas** - Each module gets its own schema file with only the types it needs (tree-shaking friendly)
- **Form Handling** - Auto-generates form schemas with `BuildedInput<T>` wrappers and validation support
- **Type-Safe API Calls** - Full TypeScript support for all API operations
- **Query Parameter Sync** - `QueryBuilder` and `EnumQueryBuilder` keep state synced with URL searchParams
- **Enum Support** - Auto-generates enum types and array enum query builders
- **OpenAPI/Swagger Compatible** - Works with any backend that exposes OpenAPI specs
- **Development Mode** - Smart regeneration based on environment
- **Validation Ready** - Built-in support for custom field validators
- **Vite Plugin** - Can be used as a Vite plugin for automatic generation on build

## Installation

```bash
npm install svelte-reflector
# or
yarn add svelte-reflector
# or
pnpm add svelte-reflector
```

> **Note:** `prettier` >= 3.0.0 is a required peer dependency. Make sure it's installed in your project.

## Quick Start

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
];
```

Validators are resolved from `$lib/sanitizers/validateFormats` — you need to implement and export them in your project.

### 3. Configure API Import Path (Optional)

Create a `reflector.json` in your project root to customize the API import path:

```json
{
  "api": "$lib/api"
}
```

Defaults to `$lib/api` if not specified. This is the module that generated modules will import for making HTTP requests.

### 4. Run the Generator

```bash
# Manual generation
npx reflect

# Or programmatically as a Vite plugin
import { reflector } from "svelte-reflector";
await reflector(true); // true = force generation
```

### 5. Use Generated Modules

Generated modules are **abstract classes**. Extend them to add custom logic or simply to instantiate:

```typescript
import { UserModule } from "$reflector/controllers/user/user.module.svelte";
import type { User } from "$reflector/controllers/user/user.schema.svelte";

// Extend the abstract module
class UserService extends UserModule {}

const userService = new UserService();

// Access reactive state
console.log(userService.loading); // $state<boolean>
console.log(userService.list);    // $state<User[]>

// Call API methods
await userService.listAll({
  behavior: {
    onSuccess: (response) => console.log(response),
    onError: (error) => console.error(error),
  },
});

// Work with forms
const userForm = userService.forms.createUser;
userForm.name.value = "John Doe";
userForm.email.value = "john@example.com";

// Submit form
await userService.createUser();
```

## Generated Structure

```
src/reflector/
├── controllers/
│   └── user/
│       ├── user.module.svelte.ts      # Abstract API module with methods
│       └── user.schema.svelte.ts      # Schemas & types used by this module
├── reflector.svelte.ts                # Core utilities (build, isFormValid, QueryBuilder, etc.)
├── fields.ts                          # Field name constants
├── enums.ts                           # Enum type definitions
├── mocked-params.svelte.ts            # Mocked path parameters ($state)
└── backup.json                        # Cached OpenAPI spec
```

Each module gets its own schema file (`*.schema.svelte.ts`) containing only the schemas it uses, with transitive dependencies automatically resolved.

## Generated Module API

Each generated module is an **abstract class** that provides:

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `loading` | `$state<boolean>` | Request loading state |
| `list` | `$state<T[]>` | List results (for list endpoints) |
| `forms` | `$state<Record<string, T>>` | Form instances |
| `querys` | `Querys` | Query parameter state (QueryBuilder instances) |
| `headers` | `Headers` | Header state |
| `paths` | `Paths` | Path parameter state |

### Methods

```typescript
// List all items (GET with page parameter)
async listAll(params?: { behavior?: Behavior }): Promise<T[]>

// Get single entity (GET without page parameter)
async get(params?: { behavior?: Behavior }): Promise<T>

// Create/Update (POST/PUT/PATCH)
async create(params?: { behavior?: Behavior }): Promise<T>
async update(params?: { behavior?: Behavior }): Promise<T>

// Delete (DELETE)
async delete(params?: { behavior?: Behavior }): Promise<void>

// Reset all state (protected)
protected reset(): void

// Clear forms (protected)
protected clearForms(): void
```

> `reset()` and `clearForms()` are `protected` — override them in your subclass if you need custom reset behavior.

### QueryBuilder

Query parameters are wrapped in `QueryBuilder` instances that sync with URL searchParams:

```typescript
// Single value query parameter
const querys = module.querys;
querys.status.update("active"); // Updates URL searchParam and internal state

// Array enum query parameter
const enumQuery = module.querys.roles; // EnumQueryBuilder<RoleType>
enumQuery.selected = "admin";
enumQuery.add();      // Adds to URL searchParams
enumQuery.remove(0);  // Removes from URL searchParams
enumQuery.values;     // $derived from URL - always in sync
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_URL` | Yes* | Backend API URL |
| `PUBLIC_BACKEND` | Yes* | Alternative to BACKEND_URL |
| `ENVIRONMENT` | No | DEV/PROD (defaults to PROD) |
| `VITE_ENVIRONMENT` | No | Vite-specific env var |
| `NODE_ENV` | No | Node environment |

\* At least one of `BACKEND_URL` or `PUBLIC_BACKEND` is required.

### Behavior Pattern

All API methods accept a `Behavior` object for callbacks:

```typescript
class Behavior<TSuccess, TError> {
  onSuccess?: (value: TSuccess) => Promise<void> | void;
  onError?: (error: TError) => Promise<void> | void;
}

// Usage
await userService.createUser({
  behavior: {
    onSuccess: (user) => console.log("Created:", user),
    onError: (err) => console.error("Failed:", err),
  },
});
```

### Form Validation

Forms use `BuildedInput` class with validation:

```typescript
class BuildedInput<T> {
  value: T;           // Current value ($state)
  display: T;         // Display value ($state)
  required: boolean;  // Is field required
  placeholder: T;     // Placeholder/example value
  readonly kind: 'builded';
  validator?: (v: T) => string | null; // Validation function
  validate(): string | null; // Run validation
}

// Check if all form fields are valid
import { isFormValid } from "$reflector/reflector.svelte";

if (isFormValid(userService.forms.createUser)) {
  await userService.createUser();
}
```

## TypeScript Configuration

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

## Workflow

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

## Advanced Usage

### Extending Abstract Modules

Since modules are abstract, you can add custom logic:

```typescript
import { UserModule } from "$reflector/controllers/user/user.module.svelte";

class UserService extends UserModule {
  // Add custom computed state
  get activeUsers() {
    return this.list.filter(u => u.active);
  }

  // Override protected methods for custom behavior
  protected override clearForms() {
    super.clearForms();
    // custom cleanup logic
  }

  // Add custom methods
  async fetchAndFilter(status: string) {
    this.querys.status.update(status);
    await this.listAll();
  }
}
```

### Manual Schema Access

```typescript
import { User } from "$reflector/controllers/user/user.schema.svelte";

// Create instance
const user = new User({ name: "John", email: "john@example.com" });

// Get data bundle
const data = user.bundle(); // { name: "John", email: "john@example.com" }
```

### Batch Query Updates

```typescript
import { setQueryGroup } from "$reflector/reflector.svelte";

// Update multiple query params at once
setQueryGroup([
  { key: "page", value: 1 },
  { key: "status", value: "active" },
  { key: "roles", value: ["admin", "editor"] }, // Array params supported
]);
```

## Troubleshooting

### "BACKEND_URL vazio" Error

Ensure you have set `BACKEND_URL` or `PUBLIC_BACKEND` in your `.env` file.

### Schemas Not Updating

In DEV mode, run `npx reflect` manually. Check that your backend's OpenAPI spec is accessible at `{BACKEND_URL}openapi.json`.

### Type Errors After Generation

1. Restart your TypeScript language server
2. Check path aliases in `tsconfig.json`
3. Ensure `$reflector/*` alias is configured

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Links

- [npm](https://www.npmjs.com/package/svelte-reflector)
- [GitHub](https://github.com/aleleppy/reflector)
- [Svelte](https://svelte.dev/)
- [OpenAPI Specification](https://swagger.io/specification/)

---

Built with by the Pinaculo Digital team.
