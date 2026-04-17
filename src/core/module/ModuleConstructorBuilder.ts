import { dedent } from "../../helpers/codegen.js";
import type { ReflectorConfig } from "../config/ReflectorConfig.js";

export interface Form {
  name: string;
  type: string;
}

export class ModuleConstructorBuilder {
  private readonly config: ReflectorConfig;

  constructor(config: ReflectorConfig) {
    this.config = config;
  }

  build(form: Form[]): string {
    if (form.length === 0) return "";

    const formEntries = form.map((f) => `${f.name}: new ${f.type}({ empty: true })`).join(", ");

    return dedent`
      constructor(params?: { empty: boolean }) {
        const isEmpty = params?.empty ?? ${this.config.environmentFlag} !== 'DEV';
        this.forms = this.buildForms(isEmpty);
      }

      private buildForms(isEmpty: boolean) {
        if(!isEmpty) return this.forms

        return { ${formEntries} }
      }
    `;
  }
}
