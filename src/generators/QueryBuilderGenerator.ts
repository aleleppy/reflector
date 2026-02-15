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
}

export class EnumQueryBuilder<T> {
  private readonly key: string = '';
  values = $derived(page.url.searchParams.getAll(this.key)) as T[];
  selected = $state<T | null>(null);

  constructor(params: { key: string; values: T[] }) {
    const { key } = params;
    this.key = key;
  }

  add() {
    if (!this.selected) return;
    const values = [...this.values, this.selected] as string[];
    changeArrayParam({ key: this.key, values });
    this.selected = null;
  }

  remove(index: number) {
    const values = [
      ...this.values.slice(0, index),
      ...this.values.slice(index + 1),
    ] as string[];
    return changeArrayParam({ key: this.key, values });
  }
}`;
  }
}
