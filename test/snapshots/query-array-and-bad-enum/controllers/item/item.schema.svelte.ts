import { build, BuildedInput, bundleStrict } from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";
export type ItemController_listResponseInterface = ItemInterface[];

export class ItemController_listResponse {
  data = $state<Item[]>([]);

  constructor(params?: {
    data?: ItemController_listResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data = params?.data?.map((item) => new Item({ data: item })) ?? [];
  }

  static from(data: ItemController_listResponseInterface) {
    return data.map((item) => new Item({ data: item }));
  }

  bundle(): ItemController_listResponseInterface {
    return this.data.map((item) => item.bundle());
  }
}

export interface ItemInterface {
  id: string;
  name: string;
}
export class Item {
  id: BuildedInput<string>;
  name: BuildedInput<string>;

  constructor(params?: { data?: ItemInterface | undefined; empty?: boolean }) {
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
