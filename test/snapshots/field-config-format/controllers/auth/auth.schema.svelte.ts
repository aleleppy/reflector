import {
  build,
  BuildedInput,
  bundleInputs,
  untouchForm,
} from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface SignUpDtoInterface {
  email: string;
  password: string;
  inviteId: string;
}
export class SignUpDto {
  email: BuildedInput<string>;
  password: BuildedInput<string>;
  inviteId: BuildedInput<string>;

  constructor(params?: {
    data?: SignUpDtoInterface | undefined;
    empty?: boolean;
  }) {
    this.email = build({
      key: params?.data?.email,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.password = build({
      key: params?.data?.password,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.strongPassword,
    });
    this.inviteId = build({
      key: params?.data?.inviteId,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<SignUpDtoInterface>): void {
    if (data.email !== undefined) this.email.hydrate(data.email as never);
    if (data.password !== undefined)
      this.password.hydrate(data.password as never);
    if (data.inviteId !== undefined)
      this.inviteId.hydrate(data.inviteId as never);
  }

  reset(): void {
    this.hydrate(
      new SignUpDto({ empty: true }).bundle() as Partial<SignUpDtoInterface>,
    );
    untouchForm(this);
  }

  bundle() {
    return bundleInputs({
      email: this.email,
      password: this.password,
      inviteId: this.inviteId,
    });
  }
}

export interface SignInDtoInterface {
  email: string;
  password: string;
}
export class SignInDto {
  email: BuildedInput<string>;
  password: BuildedInput<string>;

  constructor(params?: {
    data?: SignInDtoInterface | undefined;
    empty?: boolean;
  }) {
    this.email = build({
      key: params?.data?.email,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.password = build({
      key: params?.data?.password,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.minLength,
    });
  }

  hydrate(data: Partial<SignInDtoInterface>): void {
    if (data.email !== undefined) this.email.hydrate(data.email as never);
    if (data.password !== undefined)
      this.password.hydrate(data.password as never);
  }

  reset(): void {
    this.hydrate(
      new SignInDto({ empty: true }).bundle() as Partial<SignInDtoInterface>,
    );
    untouchForm(this);
  }

  bundle() {
    return bundleInputs({ email: this.email, password: this.password });
  }
}
