export class QueryBuilderGenerator {
  generate(): string {
    return `export class QueryBuilder {
  private readonly key: string = '';
  value = $derived(page.url.searchParams.get(this.key));

  constructor(params: { key: string; value: string | number | null }) {
    const { key } = params;
    this.key = key;
  }

  update(event: SvelteEvent) {
    return changeParam({ key: this.key, event });
  }
}`;
  }
}
