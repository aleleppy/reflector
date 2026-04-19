import { build, BuildedInput } from "$reflector/reflector.svelte";
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
    return { name: this.name?.value };
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
    return { id: this.id?.value, name: this.name?.value };
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
    return { id: this.id?.value, name: this.name?.value };
  }
}
