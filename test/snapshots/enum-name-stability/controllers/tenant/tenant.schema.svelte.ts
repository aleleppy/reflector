import {
  build,
  BuildedInput,
  bundleStrict,
  bundleInputs,
} from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import type {
  ENUM_USER_ENTITY_KIND,
  ENUM_MUNICIPALITY_BACK_OFFICE_STATE,
  ENUM_MUNICIPALITY_BACK_OFFICE_STATES,
  ENUM_TENANT_ADDRESS_STATE,
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

export interface MunicipalityBackOfficeInterface {
  states: ENUM_MUNICIPALITY_BACK_OFFICE_STATES[];
  state: ENUM_MUNICIPALITY_BACK_OFFICE_STATE;
}
export class MunicipalityBackOffice {
  states = $state<ENUM_MUNICIPALITY_BACK_OFFICE_STATES[]>([]);
  state: BuildedInput<ENUM_MUNICIPALITY_BACK_OFFICE_STATE>;

  constructor(params?: {
    data?: MunicipalityBackOfficeInterface | undefined;
    empty?: boolean;
  }) {
    this.states =
      params?.data?.states != null
        ? params.data.states
        : params?.data?.states === null
          ? []
          : [];
    this.state = build({
      key: params?.data?.state,
      placeholder: "SP",
      example: "SP",
      required: true,
    });
  }

  static from(data: ENUM_MUNICIPALITY_BACK_OFFICE_STATES[]) {
    return data.map((obj) => obj);
  }

  hydrate(data: Partial<MunicipalityBackOfficeInterface>): void {
    if (data.states !== undefined) this.states = data.states ?? [];
    if (data.state !== undefined) this.state.hydrate(data.state as never);
  }

  reset(): void {
    this.hydrate(
      new MunicipalityBackOffice({
        empty: true,
      }).bundle() as Partial<MunicipalityBackOfficeInterface>,
    );
  }

  bundle() {
    return bundleInputs({ states: this.states, state: this.state });
  }
}

export interface TenantAddressInterface {
  state: ENUM_TENANT_ADDRESS_STATE;
}
export class TenantAddress {
  state: BuildedInput<ENUM_TENANT_ADDRESS_STATE>;

  constructor(params?: {
    data?: TenantAddressInterface | undefined;
    empty?: boolean;
  }) {
    this.state = build({
      key: params?.data?.state,
      placeholder: "SP",
      example: "SP",
      required: true,
    });
  }

  hydrate(data: Partial<TenantAddressInterface>): void {
    if (data.state !== undefined) this.state.hydrate(data.state as never);
  }

  reset(): void {
    this.hydrate(
      new TenantAddress({
        empty: true,
      }).bundle() as Partial<TenantAddressInterface>,
    );
  }

  bundle() {
    return bundleStrict({ state: this.state?.value });
  }
}
