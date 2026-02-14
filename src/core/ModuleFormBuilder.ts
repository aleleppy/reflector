interface Form {
  name: string;
  type: string;
}

export class ModuleFormBuilder {
  buildConstructor(form: Form[]): string {
    if (form.length === 0) return "";
    return `
      constructor(params?: { empty: boolean }) {
        const isEmpty = PUBLIC_ENVIRONMENT !== 'DEV' || !!params?.empty;
        this.forms = this.buildForms(isEmpty);
      }

      private buildForms(isEmpty: boolean) {
        if(!isEmpty) return this.forms
        return {
          ${form.map((f) => `${f.name}: new ${f.type}({ empty: true })`)}
        }
      }
    `;
  }

  buildFormsState(formSet: Set<string>): { attributes: Set<string>; init: Set<string>; clear: Set<string> } {
    if (formSet.size === 0) {
      return { attributes: new Set(), init: new Set(), clear: new Set() };
    }

    const attributes = new Set<string>([
      `forms = $state({
        ${Array.from(formSet)}
      })`
    ]);

    const init = new Set<string>([`this.clearForms()`]);

    const clear = new Set<string>([`
      clearForms() { this.forms = this.buildForms(true) };
    `]);

    return { attributes, init, clear };
  }
}
