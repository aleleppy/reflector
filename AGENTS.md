# Svelte Reflector - Agent Guide

## Project Overview

**Svelte Reflector** is a TypeScript code generator that transforms OpenAPI specifications into fully-typed, reactive Svelte 5 modules. It bridges backend OpenAPI/Swagger documentation with frontend Svelte applications by generating:

- TypeScript interfaces and classes from OpenAPI schemas
- Svelte 5 runes-based (`$state`) reactive modules
- Form handling with built-in validation support
- Type-safe API client methods

The project is published as `svelte-reflector` on npm.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript 5.9+ |
| Runtime | Node.js (ES2022) |
| Module System | ES Modules (NodeNext) |
| HTTP Client | axios |
| Environment Config | dotenv |
| Code Formatting | prettier |
| Target Framework | Svelte 5 |

## Project Structure

```
reflector/
├── src/                          # Source code
│   ├── core/                     # Core code generation engine
│   │   ├── method/               # Method analysis and generation
│   │   │   ├── generators/       # Method code generators
│   │   │   │   ├── MethodApiCallBuilder.ts
│   │   │   │   ├── MethodGenerator.ts
│   │   │   │   └── MethodPropsBuilder.ts
│   │   │   ├── Method.ts
│   │   │   ├── MethodApiTypeAnalyzer.ts
│   │   │   ├── MethodBodyAnalyzer.ts
│   │   │   ├── MethodBuilder.ts
│   │   │   ├── MethodEndpointBuilder.ts
│   │   │   ├── MethodRequestAnalyzer.ts
│   │   │   └── MethodResponseAnalyzer.ts
│   │   └── module/               # Module code generation
│   │       ├── ModuleClassBuilder.ts
│   │       ├── ModuleConstructorBuilder.ts
│   │       ├── ModuleFileBuilder.ts
│   │       ├── ModuleImports.ts
│   │       ├── ModuleMethodProcessor.ts
│   │       └── ModuleParamProcessor.ts
│   ├── props/                    # Property type handlers
│   │   ├── array.property.ts
│   │   ├── enum.property.ts
│   │   ├── object.property.ts
│   │   └── primitive.property.ts
│   ├── types/                    # Type definitions
│   │   ├── open-api-spec.interface.ts  # OpenAPI spec types
│   │   └── types.ts              # Internal types
│   ├── helpers/                  # Utility functions
│   │   └── helpers.ts
│   ├── file.ts                   # File I/O utilities
│   ├── interface.ts              # Interface generation
│   ├── main.ts                   # Main Reflector orchestrator
│   ├── method.ts                 # Method entity
│   ├── module.ts                 # Module entity
│   ├── reflector.ts              # Runtime utilities generation
│   ├── request.ts                # Request analysis
│   ├── schema.ts                 # Schema entity
│   └── vars.global.ts            # Global constants
├── dist/                         # Compiled JavaScript output
├── package.json                  # NPM package config
├── tsconfig.json                 # TypeScript configuration
└── .env                          # Environment variables (gitignored)
```

## Build Commands

```bash
# Compile TypeScript to JavaScript (dist/)
npm run build

# The build output is committed to dist/ and published to npm
```

**Note:** The `dist/` folder is both compiled output AND published to npm. After making changes to `src/`, you must run `npm run build` to update `dist/`.

## Entry Points

| Entry | File | Purpose |
|-------|------|---------|
| Library | `dist/index.js` | Programmatic API (`reflector()` function) |
| CLI | `dist/cli.js` | Command-line tool (`npx reflect`) |

## Configuration

### Environment Variables

The generator reads from `.env` file:

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_URL` or `PUBLIC_BACKEND` | ✅ | Backend API URL with OpenAPI spec |
| `ENVIRONMENT` or `VITE_ENVIRONMENT` or `NODE_ENV` | ❌ | `DEV` or `PROD` (default: `PROD`) |

### User Configuration (Optional)

Users can create `src/reflector.config.ts` to define field validators:

```typescript
export const validators = [
  { fields: ["email", "userEmail"], validator: "validateEmail" },
  { fields: ["phone", "mobile"], validator: "validatePhone" },
];
```

## Code Generation Architecture

### 1. OpenAPI Fetching (`dist/generate-doc.js`)

1. Reads environment variables
2. Fetches `{BACKEND_URL}openapi.json`
3. Falls back to local backup if fetch fails
4. Parses `reflector.config.ts` for validators

### 2. Schema Processing (`src/main.ts` - `Reflector` class)

```
OpenAPI Spec
    ↓
components.schemas → Schema classes → TypeScript interfaces + classes
paths → Module classes → API method modules
```

### 3. Module Generation (`src/module.ts` - `Module` class)

Each API controller becomes a Svelte module with:
- `$state` reactive properties
- Form handling methods
- Type-safe API calls
- Query/Path/Header parameter builders

### 4. File Output (in user's project)

Generated files are written to `src/reflector/`:

```
src/reflector/
├── controllers/
│   └── {controller}/
│       └── {controller}.module.svelte.ts   # API modules
├── schemas.svelte.ts                       # Type definitions
├── reflector.svelte.ts                     # Runtime utilities
├── fields.ts                               # Field name constants
├── enums.ts                                # Enum definitions
└── backup.json                             # Cached OpenAPI spec
```

## Key Classes and Responsibilities

| Class | File | Responsibility |
|-------|------|----------------|
| `Reflector` | `main.ts` | Orchestrates the entire generation process |
| `Schema` | `schema.ts` | Processes OpenAPI schemas into TypeScript classes/interfaces |
| `Module` | `module.ts` | Generates Svelte API modules from OpenAPI paths |
| `Method` | `method.ts` | Represents a single API endpoint operation |
| `Request` | `request.ts` | Analyzes request/response types from OpenAPI operations |
| `ReflectorFile` | `reflector.ts` | Generates runtime utilities (BuildedInput, Behavior, etc.) |
| `PrimitiveProp` | `props/primitive.property.ts` | Handles primitive property code generation |
| `ArrayProp` | `props/array.property.ts` | Handles array property code generation |
| `EnumProp` | `props/enum.property.ts` | Handles enum property code generation |
| `ObjectProp` | `props/object.property.ts` | Handles reference/object property code generation |

## TypeScript Configuration

The project uses strict TypeScript settings:

- `target`: ES2022
- `module`: NodeNext (ES Modules)
- `strict`: true
- `exactOptionalPropertyTypes`: true
- `noUncheckedIndexedAccess`: true
- `verbatimModuleSyntax`: true
- No synthetic default imports

## Development Mode Behavior

| Environment | Behavior |
|-------------|----------|
| `DEV` | Schemas NOT auto-generated; manual `npx reflect` required |
| `PROD` | Schemas auto-generated on each build; fallback to backup.json |

## Dependencies

### Runtime Dependencies
- `axios`: HTTP client for fetching OpenAPI specs
- `dotenv`: Environment variable loading

### Dev Dependencies
- `typescript`: TypeScript compiler
- `@types/node`: Node.js type definitions
- `prettier`: Code formatting

## Code Style Guidelines

1. **Use explicit file extensions**: All imports include `.js` extension (e.g., `import { X } from "./file.js"`)
2. **Strict types**: Enable all strict TypeScript options
3. **No default exports**: Use named exports only
4. **No synthetic imports**: Use `esModuleInterop: false`
5. **Prettier formatting**: All generated code goes through prettier

## Testing Strategy

This project currently has no automated test suite. Testing is done by:

1. Running against real OpenAPI specs
2. Verifying generated code compiles in Svelte projects
3. Manual integration testing

## Security Considerations

1. **Environment variables**: BACKEND_URL should not expose sensitive endpoints
2. **No validation of OpenAPI spec**: The generator trusts the OpenAPI input
3. **File system access**: Writes to `src/reflector/` directory

## Common Tasks

### Adding a New Property Type

1. Create new class in `src/props/{type}.property.ts`
2. Implement `interfaceBuild()`, `classBuild()`, `constructorBuild()`, `bundleBuild()`
3. Update `Schema.processEntities()` to handle the new type
4. Update `AttributeProp` type union in `types/types.ts`

### Modifying Generated Module Structure

1. Update `ModuleFileBuilder.buildClass()` in `src/core/module/ModuleFileBuilder.ts`
2. Update `Module.buildModuleData()` in `src/module.ts` for attribute handling

### Adding New Runtime Utilities

1. Add to `ReflectorFile` class in `src/reflector.ts`
2. Available in generated code via `$reflector/reflector.svelte` import

## CLI Usage

```bash
# Install globally
npm install -g svelte-reflector

# Run generator (requires .env with BACKEND_URL)
npx reflect

# Or programmatically
import { reflector } from "svelte-reflector";
await reflector(true);  // true = force generation
```
