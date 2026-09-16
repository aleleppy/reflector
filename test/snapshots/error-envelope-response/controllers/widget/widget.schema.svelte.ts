import { build, BuildedInput, bundleStrict } from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface WidgetInterface {
  id: string;
  name: string;
}
export class Widget {
  id: BuildedInput<string>;
  name: BuildedInput<string>;

  constructor(params?: {
    data?: WidgetInterface | undefined;
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

  hydrate(data: Partial<WidgetInterface>): void {
    if (data.id !== undefined) this.id.hydrate(data.id as never);
    if (data.name !== undefined) this.name.hydrate(data.name as never);
  }

  reset(): void {
    this.hydrate(
      new Widget({ empty: true }).bundle() as Partial<WidgetInterface>,
    );
  }

  bundle() {
    return bundleStrict({ id: this.id?.value, name: this.name?.value });
  }
}
export type WidgetController_listResponseInterface = WidgetInterface[];

export class WidgetController_listResponse {
  data = $state<Widget[]>([]);

  constructor(params?: {
    data?: WidgetController_listResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data = params?.data?.map((item) => new Widget({ data: item })) ?? [];
  }

  static from(data: WidgetController_listResponseInterface) {
    return data.map((item) => new Widget({ data: item }));
  }

  bundle(): WidgetController_listResponseInterface {
    return this.data.map((item) => item.bundle());
  }
}
