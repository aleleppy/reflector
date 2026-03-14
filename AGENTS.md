# Svelte Reflector - Agent Guide

## Project Overview

**Svelte Reflector** is a TypeScript code generator that transforms OpenAPI specifications into fully-typed, reactive Svelte 5 modules. It bridges backend OpenAPI/Swagger documentation with frontend Svelte applications by generating:

- TypeScript interfaces and classes from OpenAPI schemas
- Svelte 5 runes-based (`$state`, `$derived`) reactive modules
- Form handling with built-in validation support
- Type-safe API client methods
- Query/Path/Header parameter builders with URL sync
- Enum types and enum query builders

The project is published as `svelte-reflector` on npm (v1.1.14).

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
│   │   ├── index.ts              # Barrel exports for core modules
│   │   ├── method/               # Method analysis and generation
│   │   │   ├── generators/       # Method code generators
│   │   │   │   ├── MethodApiCallBuilder.ts   # Builds API call logic (GET/POST/PUT/DELETE)
│   │   │   │   ├── MethodGenerator.ts        # Main method code generator
│   │   │   │   └── MethodPropsBuilder.ts     # Builds prop initialization code
│   │   │   ├── Method.ts                     # Method entity with analyzers
│   │   │   ├── MethodApiTypeAnalyzer.ts      # Determines operation type (list/entity/form)
│   │   │   ├── MethodBodyAnalyzer.ts         # Extracts request body type
│   │   │   ├── MethodBuilder.ts              # Orchestrates method analysis pipeline
│   │   │   ├── MethodEndpointBuilder.ts      # Builds endpoint URL templates
│   │   │   ├── MethodRequestAnalyzer.ts      # Parses path/query/header/cookie params
│   │   │   └── MethodResponseAnalyzer.ts     # Extracts response types
│   │   └── module/               # Module code generation
│   │       ├── ModuleClassBuilder.ts         # Builds Paths/Querys/Headers classes
│   │       ├── ModuleConstructorBuilder.ts   # Builds module constructor
│   │       ├── ModuleFileBuilder.ts          # Assembles final module file
│   │       ├── ModuleImports.ts              # Manages imports (regular, reflector, enum, mocked)
│   │       ├── ModuleMethodProcessor.ts      # Processes methods, determines state props
│   │       └── ModuleParamProcessor.ts       # Processes query/path/header params
│   ├── props/                    # Property type handlers
│   │   ├── array.property.ts     # Handles arrays and array enums
│   │   ├── enum.property.ts      # Handles enum types
│   │   ├── object.property.ts    # Handles $ref object references
│   │   └── primitive.property.ts # Handles string, number, boolean
│   ├── types/                    # Type definitions
│   │   ├── open-api-spec.interface.ts  # OpenAPI 3.0 spec types
│   │   └── types.ts              # Internal types (AttributeProp, ParamType, etc.)
│   ├── helpers/                  # Utility functions
│   │   └── helpers.ts            # String utils, endpoint parsing, validation helpers
│   ├── file.ts                   # Source class - file I/O with prettier formatting
│   ├── interface.ts              # ReflectorInterface - generates TypeScript interfaces
│   ├── main.ts                   # Reflector class - main orchestrator
│   ├── method.ts                 # Method wrapper class (delegates to core builders)
│   ├── module.ts                 # Module class - coordinates all builders
│   ├── reflector.ts              # ReflectorFile - generates runtime utilities
│   ├── request.ts                # Request class - analyzes request/response types
│   ├── schema.ts                 # Schema class - processes OpenAPI schemas
│   └── vars.global.ts            # Global constants (baseDir, generatedDir)
├── dist/                         # Compiled JavaScript output
│   ├── index.js                  # Library entry (exports reflector function)
│   ├── cli.js                    # CLI entry (npx reflect)
│   ├── generate-doc.js           # OpenAPI fetching and orchestration
│   └── helpers/
│       ├── generate-doc.helper.js # Config file parsing
│       └── input.js              # Input utilities
├── package.json                  # NPM package config
├── tsconfig.json                 # TypeScript configuration
└── .env                          # Environment variables (gitignored)
```

**Note:** Some entrypoint files (`cli.ts`, `generate-doc.ts`, `helpers/generate-doc.helper.ts`, `helpers/input.ts`) exist only in `dist/` as compiled output. Their source files are not present in `src/`.

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
| Generator | `dist/generate-doc.js` | Fetches OpenAPI spec, creates Reflector instance, runs build |

## Configuration

### Environment Variables

The generator reads from `.env` file:

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_URL` or `PUBLIC_BACKEND` | Yes | Backend API URL with OpenAPI spec |
| `ENVIRONMENT` or `VITE_ENVIRONMENT` or `NODE_ENV` | No | `DEV` or `PROD` (default: `PROD`) |

### User Configuration (Optional)

Users can create `src/reflector.config.ts` to define field validators:

```typescript
export const validators = [
  { fields: ["email", "userEmail"], validator: "validateEmail" },
  { fields: ["phone", "mobile"], validator: "validatePhone" },
];
```

## Code Generation Architecture

### Data Flow

```
OpenAPI Spec (fetched via axios from {BACKEND_URL}openapi.json)
    ↓
generate-doc.js
    ├─→ Parses reflector.config.ts for validators
    └─→ Creates Reflector instance
         ↓
Reflector.constructor()
    ├─→ getSchemas() → Schema classes (process OpenAPI components)
    │   ├─→ PrimitiveProp (string, number, boolean)
    │   ├─→ ArrayProp (arrays, array enums)
    │   ├─→ EnumProp (enum types)
    │   ├─→ ObjectProp ($ref references)
    │   └─→ ReflectorInterface (TypeScript interface generation)
    └─→ getModules() → Module classes (process OpenAPI paths)
         ├─→ Method (wraps each API operation)
         │   ├─→ MethodBuilder (orchestrates analysis)
         │   │   ├─→ MethodRequestAnalyzer (parameters)
         │   │   ├─→ MethodResponseAnalyzer (response types)
         │   │   ├─→ MethodApiTypeAnalyzer (list/entity/form)
         │   │   └─→ MethodBodyAnalyzer (request body)
         │   └─→ MethodGenerator (generates TypeScript code)
         │       ├─→ MethodEndpointBuilder (URL templates)
         │       ├─→ MethodApiCallBuilder (API call logic)
         │       └─→ MethodPropsBuilder (prop initialization)
         ├─→ ModuleMethodProcessor (processes all methods)
         ├─→ ModuleParamProcessor → ModuleClassBuilder (Paths/Querys/Headers)
         ├─→ ModuleConstructorBuilder (form initialization)
         ├─→ ModuleImports (manages all imports)
         └─→ ModuleFileBuilder (assembles final file)
    ↓
Reflector.build()
    ├─→ schemas.svelte.ts (interfaces + classes)
    ├─→ reflector.svelte.ts (runtime utilities)
    ├─→ fields.ts (FIELD_NAMES constant)
    ├─→ enums.ts (enum type definitions)
    ├─→ mocked-params.svelte.ts (path param mocks with $state)
    └─→ controllers/**/*.module.svelte.ts (API modules)
```

### Generated File Output (in user's project)

```
src/reflector/
├── controllers/
│   └── {controller}/
│       └── {controller}.module.svelte.ts   # API modules
├── schemas.svelte.ts                       # Type definitions (interfaces + classes)
├── reflector.svelte.ts                     # Runtime utilities
├── fields.ts                               # Field name constants
├── enums.ts                                # Enum definitions
├── mocked-params.svelte.ts                 # Mocked path parameters ($state)
└── backup.json                             # Cached OpenAPI spec
```

## Key Classes and Responsibilities

### Orchestration Layer

| Class | File | Responsibility |
|-------|------|----------------|
| `Reflector` | `main.ts` | Orchestrates the entire generation process, manages global state (enumTypes, mockedParams) |
| `Module` | `module.ts` | Generates Svelte API modules from OpenAPI paths, coordinates all builders |
| `Method` | `method.ts` | Wraps a single API endpoint, delegates to MethodBuilder and MethodGenerator |
| `Schema` | `schema.ts` | Processes OpenAPI schemas into TypeScript classes/interfaces |
| `Request` | `request.ts` | Analyzes request/response types from OpenAPI operations |

### Core Method Pipeline

| Class | File | Responsibility |
|-------|------|----------------|
| `MethodBuilder` | `core/method/MethodBuilder.ts` | Orchestrates analysis of an OpenAPI operation |
| `MethodRequestAnalyzer` | `core/method/MethodRequestAnalyzer.ts` | Parses and categorizes parameters (path, query, header, cookie) |
| `MethodResponseAnalyzer` | `core/method/MethodResponseAnalyzer.ts` | Extracts response types, detects enum responses |
| `MethodApiTypeAnalyzer` | `core/method/MethodApiTypeAnalyzer.ts` | Determines operation type: form (POST/PUT/PATCH), list (GET+page), entity (GET) |
| `MethodBodyAnalyzer` | `core/method/MethodBodyAnalyzer.ts` | Extracts request body type from operation |
| `MethodGenerator` | `core/method/generators/MethodGenerator.ts` | Generates complete TypeScript method code |
| `MethodApiCallBuilder` | `core/method/generators/MethodApiCallBuilder.ts` | Builds API call logic (axios calls with proper HTTP method) |
| `MethodPropsBuilder` | `core/method/generators/MethodPropsBuilder.ts` | Builds variable initialization from parameters |
| `MethodEndpointBuilder` | `core/method/MethodEndpointBuilder.ts` | Builds endpoint URL strings with template literals |
| `Method` (core) | `core/method/Method.ts` | Data entity holding analyzed method data and analyzers |

### Core Module Pipeline

| Class | File | Responsibility |
|-------|------|----------------|
| `ModuleImports` | `core/module/ModuleImports.ts` | Manages all import types (regular, reflector, enum, mocked) |
| `ModuleMethodProcessor` | `core/module/ModuleMethodProcessor.ts` | Processes all methods, determines state properties (list, entity, forms) |
| `ModuleParamProcessor` | `core/module/ModuleParamProcessor.ts` | Processes query/path/header/cookie parameters |
| `ModuleClassBuilder` | `core/module/ModuleClassBuilder.ts` | Builds Paths, Querys, Headers classes with QueryBuilder/EnumQueryBuilder |
| `ModuleConstructorBuilder` | `core/module/ModuleConstructorBuilder.ts` | Builds module constructor for form initialization |
| `ModuleFileBuilder` | `core/module/ModuleFileBuilder.ts` | Assembles all parts into the final module file |

### Property Handlers

| Class | File | Responsibility |
|-------|------|----------------|
| `PrimitiveProp` | `props/primitive.property.ts` | Handles primitive types (string, number, boolean) |
| `ArrayProp` | `props/array.property.ts` | Handles arrays and array enums |
| `EnumProp` | `props/enum.property.ts` | Handles enum types, manages enum type registration |
| `ObjectProp` | `props/object.property.ts` | Handles `$ref` object references, supports nullable objects |

### Other Classes

| Class | File | Responsibility |
|-------|------|----------------|
| `ReflectorFile` | `reflector.ts` | Generates runtime utilities (BuildedInput, Behavior, QueryBuilder, etc.) |
| `ReflectorInterface` | `interface.ts` | Generates TypeScript interfaces from property arrays |
| `Source` | `file.ts` | File I/O with prettier formatting, path management |

## Runtime Utilities (Generated)

The `reflector.svelte.ts` file generated by `ReflectorFile` provides:

### Classes

| Class | Description |
|-------|-------------|
| `Behavior<TSuccess, TError>` | Callback pattern with `onSuccess` and `onError` handlers |
| `BuildedInput<T>` | Form field with `$state` value/display, validation, required flag, placeholder |
| `QueryBuilder` | Wraps a query parameter, syncs value with URL searchParams via `$state` |
| `EnumQueryBuilder<T>` | Array enum query parameters with `add()`, `remove()`, `$derived` values from URL |

### Functions

| Function | Description |
|----------|-------------|
| `build(params)` | Creates `BuildedInput` instances for form fields |
| `isFormValid(schema)` | Validates all `BuildedInput` fields in a form schema |
| `genericArrayBundler(data)` | Bundles arrays of objects using their `bundle()` method |
| `changeParam({ event, key })` | Updates a single URL query parameter |
| `changeArrayParam({ values, key })` | Updates array-type URL query parameters |
| `setQueryGroup(group)` | Batch updates multiple query parameters atomically |

### Types

| Type | Description |
|------|-------------|
| `ValidatorFn<T>` | `(v: T) => string \| null` - validator function signature |
| `QueryContract` | `{ event: string; key: string }` - query change event |
| `SvelteEvent` | Typed event from HTMLInputElement/HTMLButtonElement |
| `ApiErrorResponse` | `{ error: string; message: string }` - API error shape |

## Key Types & Interfaces

| Type | File | Description |
|------|------|-------------|
| `ReflectorOperation` | `types/types.ts` | OpenAPI OperationObject + `apiMethod` + `endpoint` |
| `ApiType` | `types/types.ts` | `"get" \| "post" \| "delete" \| "patch" \| "put"` |
| `ReflectorRequestType` | `request.ts` | `"entity" \| "list" \| "pagination" \| "form" \| "other"` |
| `AttributeProp` | `types/types.ts` | Union: `PrimitiveProp \| ArrayProp \| EnumProp` |
| `ParamType` | `types/types.ts` | `"Paths" \| "Querys" \| "Headers"` |
| `Info` | `types/types.ts` | `{ path, operations, moduleName }` - module grouping |
| `FieldValidators` | `types/types.ts` | `Map<string, string>` - field name to validator function |
| `ProcessedMethods` | `core/module/ModuleMethodProcessor.ts` | Result of method processing |
| `ProcessedParams` | `core/module/ModuleParamProcessor.ts` | Result of parameter processing |
| `FileBuildParams` | `core/module/ModuleFileBuilder.ts` | Parameters for final file assembly |

## TypeScript Configuration

The project uses strict TypeScript settings:

- `target`: ES2022
- `module`: NodeNext (ES Modules)
- `strict`: true
- `exactOptionalPropertyTypes`: true
- `noUncheckedIndexedAccess`: true
- `noPropertyAccessFromIndexSignature`: true
- `verbatimModuleSyntax`: true
- `esModuleInterop`: false / `allowSyntheticDefaultImports`: false
- `isolatedModules`: true
- `skipLibCheck`: false

## Development Mode Behavior

| Environment | Behavior |
|-------------|----------|
| `DEV` | Schemas NOT auto-generated; manual `npx reflect` required |
| `PROD` | Schemas auto-generated on each build; fallback to backup.json |

## Dependencies

### Runtime Dependencies
- `axios` (^1.12.2): HTTP client for fetching OpenAPI specs
- `dotenv` (^16.4.5): Environment variable loading

### Dev Dependencies
- `typescript` (^5.9.3): TypeScript compiler
- `@types/node` (^24.8.1): Node.js type definitions
- `prettier` (^3.6.2): Code formatting for generated output

## Code Style Guidelines

1. **Use explicit file extensions**: All imports include `.js` extension (e.g., `import { X } from "./file.js"`)
2. **Strict types**: Enable all strict TypeScript options
3. **No default exports**: Use named exports only
4. **No synthetic imports**: Use `esModuleInterop: false`
5. **Prettier formatting**: All generated code goes through prettier
6. **Builder pattern**: Core uses builder/analyzer pattern extensively

## Testing Strategy

This project currently has no automated test suite. Testing is done by:

1. Running against real OpenAPI specs
2. Verifying generated code compiles in Svelte projects
3. Manual integration testing

## Common Tasks

### Adding a New Property Type

1. Create new class in `src/props/{type}.property.ts`
2. Implement `interfaceBuild()`, `classBuild()`, `constructorBuild()`, `bundleBuild()`
3. Update `Schema.processEntities()` to handle the new type
4. Update `AttributeProp` type union in `types/types.ts`

### Modifying Generated Module Structure

1. Update `ModuleFileBuilder.buildClass()` in `src/core/module/ModuleFileBuilder.ts`
2. Update `Module.buildModuleData()` in `src/module.ts` for attribute handling
3. Adjust `ModuleMethodProcessor` or `ModuleParamProcessor` for new state/params

### Adding a New Method Analyzer

1. Create analyzer class in `src/core/method/`
2. Add to `MethodBuilder.build()` pipeline
3. Expose results via `MethodAnalyzers` interface in `core/method/Method.ts`

### Adding New Runtime Utilities

1. Add to `ReflectorFile` class in `src/reflector.ts`
2. Available in generated code via `$reflector/reflector.svelte` import

### Modifying Import Management

1. Update `ModuleImports` in `src/core/module/ModuleImports.ts`
2. Four import categories: regular, reflector, enum, mocked

## CLI Usage

```bash
# Install globally
npm install -g svelte-reflector

# Run generator (requires .env with BACKEND_URL)
npx reflect

# Or programmatically (as Vite plugin)
import { reflector } from "svelte-reflector";
await reflector(true);  // true = force generation
```

## Global State

The `Reflector` class manages two global registries:

- `enumTypes: Map<string, string>` - Tracks all enum types discovered during generation
- `mockedParams: Set<string>` - Tracks path parameters that need mocked state
