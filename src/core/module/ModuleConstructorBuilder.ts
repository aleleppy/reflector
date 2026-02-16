export interface Form {
  name: string;
  type: string;
}

export class ModuleConstructorBuilder {
  build(form: Form[]): string {
    if (form.length === 0) return "";

    return `
      constructor(params?: { empty: boolean }) {
        const isEmpty = PUBLIC_ENVIRONMENT !== 'DEV' || !!params?.empty;
        this.forms = this.buildForms(isEmpty);
      }

      private buildForms(isEmpty: boolean) {
        if(!isEmpty) return this.forms

        return {
          ${form.map((f) => `${f.name}: new ${f.type}({ empty: true })`).join(",\n")}
        }
      }
    `;
  }
}
