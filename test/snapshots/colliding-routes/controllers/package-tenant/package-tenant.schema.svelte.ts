import { build, BuildedInput, bundleStrict } from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface PackageTenantController_updateBodyInterface {
  name: string;
}
export class PackageTenantController_updateBody {
  name: BuildedInput<string>;

  constructor(params?: {
    data?: PackageTenantController_updateBodyInterface | undefined;
    empty?: boolean;
  }) {
    this.name = build({
      key: params?.data?.name,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  bundle() {
    return bundleStrict({ name: this.name?.value });
  }
}

export interface ControllerItemInterface {
  id: string;
  name: string;
}
export class ControllerItem {
  id: BuildedInput<string>;
  name: BuildedInput<string>;

  constructor(params?: {
    data?: ControllerItemInterface | undefined;
    empty?: boolean;
  }) {
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
  }

  bundle() {
    return bundleStrict({ id: this.id?.value, name: this.name?.value });
  }
}
export type PackageTenantController_listResponse2Interface =
  ControllerItemInterface[];

export class PackageTenantController_listResponse2 {
  data = $state<ControllerItem[]>([]);

  constructor(params?: {
    data?: PackageTenantController_listResponse2Interface | undefined;
    empty?: boolean;
  }) {
    this.data =
      params?.data?.map((item) => new ControllerItem({ data: item })) ?? [];
  }

  static from(data: PackageTenantController_listResponse2Interface) {
    return data.map((item) => new ControllerItem({ data: item }));
  }

  bundle(): PackageTenantController_listResponse2Interface {
    return this.data.map((item) => item.bundle());
  }
}

export interface PackageInterface {
  id: string;
  name: string;
}
export class Package {
  id: BuildedInput<string>;
  name: BuildedInput<string>;

  constructor(params?: {
    data?: PackageInterface | undefined;
    empty?: boolean;
  }) {
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
  }

  bundle() {
    return bundleStrict({ id: this.id?.value, name: this.name?.value });
  }
}
export type PackageTenantController_listResponseInterface = PackageInterface[];

export class PackageTenantController_listResponse {
  data = $state<Package[]>([]);

  constructor(params?: {
    data?: PackageTenantController_listResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data = params?.data?.map((item) => new Package({ data: item })) ?? [];
  }

  static from(data: PackageTenantController_listResponseInterface) {
    return data.map((item) => new Package({ data: item }));
  }

  bundle(): PackageTenantController_listResponseInterface {
    return this.data.map((item) => item.bundle());
  }
}
