import { build, BuildedInput, bundleStrict } from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import type {
  ENUM_USER_ENTITY_PRIORITY,
  ENUM_USER_ENTITY_ROLES,
} from "$reflector/enums";
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
  priority?: ENUM_USER_ENTITY_PRIORITY;
}
export class User {
  id: BuildedInput<string>;
  name: BuildedInput<string>;
  email: BuildedInput<string>;
  tags? = $state<string[]>([]);
  roles? = $state<ENUM_USER_ENTITY_ROLES[]>([]);
  status = $state<UserStatus>(new UserStatus());
  address = $state<Address | null>(null);
  priority?: BuildedInput<ENUM_USER_ENTITY_PRIORITY>;

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
    this.priority = build({
      key: params?.data?.priority,
      placeholder: "low",
      example: "low",
      required: false,
    });
  }

  static from(data: ENUM_USER_ENTITY_ROLES[]) {
    return data.map((obj) => obj);
  }

  hydrate(data: Partial<UserInterface>): void {
    if (data.id !== undefined) this.id.hydrate(data.id as never);
    if (data.name !== undefined) this.name.hydrate(data.name as never);
    if (data.email !== undefined) this.email.hydrate(data.email as never);
    if (data.tags !== undefined) this.tags = data.tags ?? [];
    if (data.roles !== undefined) this.roles = data.roles ?? [];
    if (data.status !== undefined) {
      if (this.status) this.status.hydrate(data.status as never);
      else this.status = new UserStatus({ data: data.status as never });
    }
    if (data.address !== undefined) {
      if (data.address === null) this.address = null;
      else if (this.address) this.address.hydrate(data.address as never);
      else this.address = new Address({ data: data.address as never });
    }
    if (data.priority !== undefined)
      this.priority?.hydrate(data.priority as never);
  }

  reset(): void {
    this.hydrate(new User({ empty: true }).bundle() as Partial<UserInterface>);
  }

  bundle() {
    return bundleStrict({
      id: this.id?.value,
      name: this.name?.value,
      email: this.email?.value,
      tags: this.tags,
      roles: this.roles,
      status: this.status?.bundle(),
      address: this.address?.bundle() ?? null,
      priority: this.priority?.value,
    });
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
      nullable: true,
    });
  }

  hydrate(data: Partial<AddressInterface>): void {
    if (data.street !== undefined) this.street.hydrate(data.street as never);
    if (data.city !== undefined) this.city.hydrate(data.city as never);
  }

  reset(): void {
    this.hydrate(
      new Address({ empty: true }).bundle() as Partial<AddressInterface>,
    );
  }

  bundle() {
    return bundleStrict({ street: this.street?.value, city: this.city?.value });
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

  hydrate(data: Partial<UserController_createBodyInterface>): void {
    if (data.name !== undefined) this.name.hydrate(data.name as never);
    if (data.email !== undefined) this.email.hydrate(data.email as never);
    if (data.role !== undefined) {
      if (this.role) this.role.hydrate(data.role as never);
      else this.role = new UserRole({ data: data.role as never });
    }
  }

  reset(): void {
    this.hydrate(
      new UserController_createBody({
        empty: true,
      }).bundle() as Partial<UserController_createBodyInterface>,
    );
  }

  bundle() {
    return bundleStrict({
      name: this.name?.value,
      email: this.email?.value,
      role: this.role?.bundle(),
    });
  }
}
export type UserController_listResponseInterface = UserInterface[];

export class UserController_listResponse {
  data = $state<User[]>([]);

  constructor(params?: {
    data?: UserController_listResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data = params?.data?.map((item) => new User({ data: item })) ?? [];
  }

  static from(data: UserController_listResponseInterface) {
    return data.map((item) => new User({ data: item }));
  }

  bundle(): UserController_listResponseInterface {
    return this.data.map((item) => item.bundle());
  }
}
