export class QueryBuilderGenerator {
  generate(): string {
    return `export class QueryBuilder {
  private readonly key: string = '';
  value = $derived(page.url.searchParams.get(this.key));
  values = $derived(page.url.searchParams.getAll(this.key));

  constructor(params: { key: string; value?: string | number | null }) {
    const { key } = params;
    this.key = key;
  }

  update(event: SvelteEvent) {
    return changeParam({ key: this.key, event });
  }

  updateArray(values: string[]) {
    return changeArrayParam({ key: this.key, values });
  }

  updateArrayFromEvent(event: SvelteEvent) {
    return changeArrayParamFromEvent({ key: this.key, event });
  }
}`;
  }
}
