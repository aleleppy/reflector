export class ReflectorFunctionsGenerator {
  generate(): string {
    return [
      `export function build<T>(params: {
  key?: T | undefined;
  example: T;
  placeholder: T;
  required: boolean;
  validator?: ValidatorFn<T>;
}): BuildedInput<T> {
  return new BuildedInput(params);
}`,
      `export function isFormValid<T>(schema: Partial<T>): boolean {
  delete schema.bundle;

  const arrayOfBuildedInputs = Object.values(schema) as BuildedInput<unknown>[];

  const isValid = arrayOfBuildedInputs.every((a) => {
    const result = a?.validate?.() ?? null;
    return result === null;
  });

  if (!isValid) {
    toast.error('Erro ao fazer a requisição', 'Um ou mais campos preenchidos estão incorretos.');
  }

  return isValid;
}`,
      `export function genericArrayBundler<T>(data: T[]): BundleResult<T>[] {
  return data.map((item) => {
    if (typeof (item as any)?.bundle === 'function') {
      return (item as any).bundle();
    }
    return item;
  });
}`,
      `export function changeParam({ event, key }: QueryContract) {
  const newValue = event.currentTarget.value;
  const url = new URL(page.url);
  url.searchParams.set(key, String(newValue));
  goto(url, { replaceState: true, keepFocus: true });
}`,
      `export function changeArrayParam({ values, key }: { values: string[]; key: string }) {
  const url = new URL(page.url);
  url.searchParams.delete(key);
  values.forEach((value) => url.searchParams.append(key, value));
  goto(url, { replaceState: true, keepFocus: true });
}`,
      `export function changeArrayParamFromEvent({ event, key }: QueryContract) {
  const select = event.currentTarget as HTMLSelectElement;
  const selectedOptions = Array.from(select.selectedOptions).map(
    (opt) => opt.value
  );
  changeArrayParam({ values: selectedOptions, key });
}`,
    ].join(";");
  }
}
