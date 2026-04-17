import { build, BuildedInput } from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import type { ENUM_USER_ENTITY_ROLES } from "$reflector/enums";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface UserInterface {
  id: string;
  name: string;
  email: string;
  tags?: string[];
  roles?: ENUM_USER_ENTITY_ROLES[];
  status: UserStatusInterface;
  address: AddressInterface | null;
}
export class User {
  id: BuildedInput<string>;
  name: BuildedInput<string>;
  email: BuildedInput<string>;
  tags? = $state<string[]>([]);
  roles? = $state<ENUM_USER_ENTITY_ROLES[]>([]);
  status = $state<UserStatus>(new UserStatus());
  address = $state<Address | null>(null);

  constructor(params?: { data?: UserInterface | undefined; empty?: boolean }) {
    this.id = build({
      key: params?.data?.id,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.name = build({
      key: params?.data?.name,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.email = build({
      key: params?.data?.email,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.tags =
      params?.data?.tags != null
        ? params.data.tags
        : params?.data?.tags === null
          ? []
          : [];
    this.roles =
      params?.data?.roles != null
        ? params.data.roles
        : params?.data?.roles === null
          ? []
          : [];
    this.status = new UserStatus({ data: params?.data?.status });
    this.address =
      params?.data?.address != null
        ? new Address({ data: params.data.address })
        : params?.data?.address === null
          ? null
          : new Address();
  }

  static from(data: ENUM_USER_ENTITY_ROLES[]) {
    return data.map((obj) => obj);
  }

  bundle() {
    return {
      id: this.id?.value,
      name: this.name?.value,
      email: this.email?.value,
      tags: this.tags,
      roles: this.roles,
      status: this.status?.bundle(),
      address: this.address?.bundle() ?? null,
    };
  }
}

export interface AddressInterface {
  street: string;
  city: string | null;
}
export class Address {
  street: BuildedInput<string>;
  city: BuildedInput<string | null>;

  constructor(params?: {
    data?: AddressInterface | undefined;
    empty?: boolean;
  }) {
    this.street = build({
      key: params?.data?.street,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.city = build<string | null>({
      key: params?.data?.city ?? null,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: false,
    });
  }

  bundle() {
    return { street: this.street?.value, city: this.city?.value };
  }
}

export interface UserController_createBodyInterface {
  name: string;
  email: string;
  role: UserRoleInterface;
}
export class UserController_createBody {
  name: BuildedInput<string>;
  email: BuildedInput<string>;
  role = $state<UserRole>(new UserRole());

  constructor(params?: {
    data?: UserController_createBodyInterface | undefined;
    empty?: boolean;
  }) {
    this.name = build({
      key: params?.data?.name,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.email = build({
      key: params?.data?.email,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.role = new UserRole({ data: params?.data?.role });
  }

  bundle() {
    return {
      name: this.name?.value,
      email: this.email?.value,
      role: this.role?.bundle(),
    };
  }
}
