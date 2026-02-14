import { ReflectorTypesGenerator } from "./ReflectorTypes.js";
import { ReflectorClassesGenerator } from "./ReflectorClasses.js";
import { ReflectorFunctionsGenerator } from "./ReflectorFunctions.js";
import { QueryBuilderGenerator } from "./QueryBuilderGenerator.js";

export class ReflectorFileGenerator {
  private readonly imports = [
    'import toast from "$lib/utils/toast.svelte"',
    'import { goto } from "$app/navigation"',
    'import { page } from "$app/state"',
  ].join(";");

  private readonly typesGenerator = new ReflectorTypesGenerator();
  private readonly classesGenerator = new ReflectorClassesGenerator();
  private readonly functionsGenerator = new ReflectorFunctionsGenerator();
  private readonly queryBuilderGenerator = new QueryBuilderGenerator();

  generate(): string {
    const types = this.typesGenerator.generate();
    const classes = this.classesGenerator.generate();
    const functions = this.functionsGenerator.generate();
    const queryBuilder = this.queryBuilderGenerator.generate();

    return `
${this.imports}

${types}

${classes}

${functions}

${queryBuilder}
    `.trim();
  }
}
