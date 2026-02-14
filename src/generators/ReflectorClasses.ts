export class ReflectorClassesGenerator {
  generate(): string {
    return [
      `export interface ApiErrorResponse {
  error: string;
  message: string;
}`,
      `export class Behavior<TSuccess = unknown, TError = unknown> {
  onError?: (e: TError) => void;
  onSuccess?: (v: TSuccess) => void;
}`,
      `export class BuildedInput<T> {
  value = $state<T>(null as any);
  display = $state<T>(null as any);
  required: boolean;
  placeholder: T;
  readonly validator?: ValidatorFn<T>;

  constructor(params: {
    key?: T | undefined;
    example: T;
    required: boolean;
    placeholder: T;
    validator?: ValidatorFn<T>;
  }) {
    const { example, required, key, validator, placeholder } = params;
    const initial = key ?? example;

    this.value = initial;
    this.display = initial;
    this.required = required;
    this.placeholder = placeholder;

    if (validator) {
      this.validator = validator;
    }
  }

  validate(): ValidatorResult {
    if (!this.validator) return null;
    return this.validator(this.value);
  }
}`,
    ].join(";");
  }
}
