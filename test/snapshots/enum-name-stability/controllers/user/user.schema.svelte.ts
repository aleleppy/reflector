import {
  build,
  BuildedInput,
  bundleStrict,
  bundleInputs,
} from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import type {
  ENUM_USER_ENTITY_KIND,
  ENUM_USER_DTO_KIND,
} from "$reflector/enums";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface UserResInterface {
  kind: ENUM_USER_ENTITY_KIND;
}
export class UserRes {
  kind: BuildedInput<ENUM_USER_ENTITY_KIND>;

  constructor(params?: {
    data?: UserResInterface | undefined;
    empty?: boolean;
  }) {
    this.kind = build({
      key: params?.data?.kind,
      placeholder: "INTERNAL",
      example: "INTERNAL",
      required: true,
    });
  }

  hydrate(data: Partial<UserResInterface>): void {
    if (data.kind !== undefined) this.kind.hydrate(data.kind as never);
  }

  reset(): void {
    this.hydrate(
      new UserRes({ empty: true }).bundle() as Partial<UserResInterface>,
    );
  }

  bundle() {
    return bundleStrict({ kind: this.kind?.value });
  }
}

export interface UserDtoInterface {
  kind: ENUM_USER_DTO_KIND;
}
export class UserDto {
  kind: BuildedInput<ENUM_USER_DTO_KIND>;

  constructor(params?: {
    data?: UserDtoInterface | undefined;
    empty?: boolean;
  }) {
    this.kind = build({
      key: params?.data?.kind,
      placeholder: "OWNER",
      example: "OWNER",
      required: true,
    });
  }

  hydrate(data: Partial<UserDtoInterface>): void {
    if (data.kind !== undefined) this.kind.hydrate(data.kind as never);
  }

  reset(): void {
    this.hydrate(
      new UserDto({ empty: true }).bundle() as Partial<UserDtoInterface>,
    );
  }

  bundle() {
    return bundleInputs({ kind: this.kind });
  }
}
