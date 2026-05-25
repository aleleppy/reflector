import { build, BuildedInput, bundleStrict } from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import type { ENUM_ARRAY_CONTROLLER_ENUMS_DATA } from "$reflector/enums";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";
export type ArrayController_genericResponseInterface = Record<
  string,
  unknown
>[];

export class ArrayController_genericResponse {
  data = $state<Record<string, unknown>[]>([]);

  constructor(params?: {
    data?: ArrayController_genericResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data = params?.data ?? [];
  }

  static from(data: ArrayController_genericResponseInterface) {
    return data;
  }

  bundle(): ArrayController_genericResponseInterface {
    return this.data;
  }
}
export type ArrayController_inlineResponseInterface =
  ArrayController_inlineResponseItemInterface[];

export class ArrayController_inlineResponse {
  data = $state<ArrayController_inlineResponseItem[]>([]);

  constructor(params?: {
    data?: ArrayController_inlineResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data =
      params?.data?.map(
        (item) => new ArrayController_inlineResponseItem({ data: item }),
      ) ?? [];
  }

  static from(data: ArrayController_inlineResponseInterface) {
    return data.map(
      (item) => new ArrayController_inlineResponseItem({ data: item }),
    );
  }

  bundle(): ArrayController_inlineResponseInterface {
    return this.data.map((item) => item.bundle());
  }
}

export interface ArrayController_inlineResponseItemInterface {
  id: number;
  label: string;
}
export class ArrayController_inlineResponseItem {
  id: BuildedInput<number>;
  label: BuildedInput<string>;

  constructor(params?: {
    data?: ArrayController_inlineResponseItemInterface | undefined;
    empty?: boolean;
  }) {
    this.id = build({
      key: params?.data?.id,
      placeholder: 1,
      example: params?.empty || isEmpty ? 1 : 1,
      required: true,
    });
    this.label = build({
      key: params?.data?.label,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  bundle() {
    return bundleStrict({ id: this.id?.value, label: this.label?.value });
  }
}
export type ArrayController_enumsResponseInterface =
  ENUM_ARRAY_CONTROLLER_ENUMS_DATA[];

export class ArrayController_enumsResponse {
  data = $state<ENUM_ARRAY_CONTROLLER_ENUMS_DATA[]>([]);

  constructor(params?: {
    data?: ArrayController_enumsResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data = params?.data ?? [];
  }

  static from(data: ArrayController_enumsResponseInterface) {
    return data;
  }

  bundle(): ArrayController_enumsResponseInterface {
    return this.data;
  }
}
export type ArrayController_primitivesResponseInterface = string[];

export class ArrayController_primitivesResponse {
  data = $state<string[]>([]);

  constructor(params?: {
    data?: ArrayController_primitivesResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data = params?.data ?? [];
  }

  static from(data: ArrayController_primitivesResponseInterface) {
    return data;
  }

  bundle(): ArrayController_primitivesResponseInterface {
    return this.data;
  }
}
