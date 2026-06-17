import {
  build,
  BuildedInput,
  bundleStrict,
  bundleInputs,
} from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";
export type AiChatTenantController_getMessagesResponseInterface =
  AiChatMessageInterface[];

export class AiChatTenantController_getMessagesResponse {
  data = $state<AiChatMessage[]>([]);

  constructor(params?: {
    data?: AiChatTenantController_getMessagesResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data =
      params?.data?.map((item) => new AiChatMessage({ data: item })) ?? [];
  }

  static from(data: AiChatTenantController_getMessagesResponseInterface) {
    return data.map((item) => new AiChatMessage({ data: item }));
  }

  bundle(): AiChatTenantController_getMessagesResponseInterface {
    return this.data.map((item) => item.bundle());
  }
}

export interface AiChatMessageInterface {
  id: string;
  content: string;
}
export class AiChatMessage {
  id: BuildedInput<string>;
  content: BuildedInput<string>;

  constructor(params?: {
    data?: AiChatMessageInterface | undefined;
    empty?: boolean;
  }) {
    this.id = build({
      key: params?.data?.id,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.content = build({
      key: params?.data?.content,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<AiChatMessageInterface>): void {
    if (data.id !== undefined) this.id.hydrate(data.id as never);
    if (data.content !== undefined) this.content.hydrate(data.content as never);
  }

  reset(): void {
    this.hydrate(
      new AiChatMessage({
        empty: true,
      }).bundle() as Partial<AiChatMessageInterface>,
    );
  }

  bundle() {
    return bundleStrict({ id: this.id?.value, content: this.content?.value });
  }
}

export interface AiChatInterface {
  id: string;
}
export class AiChat {
  id: BuildedInput<string>;

  constructor(params?: {
    data?: AiChatInterface | undefined;
    empty?: boolean;
  }) {
    this.id = build({
      key: params?.data?.id,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<AiChatInterface>): void {
    if (data.id !== undefined) this.id.hydrate(data.id as never);
  }

  reset(): void {
    this.hydrate(
      new AiChat({ empty: true }).bundle() as Partial<AiChatInterface>,
    );
  }

  bundle() {
    return bundleStrict({ id: this.id?.value });
  }
}

export interface AiChatTenantController_createBodyInterface {
  packageId: string;
}
export class AiChatTenantController_createBody {
  packageId: BuildedInput<string>;

  constructor(params?: {
    data?: AiChatTenantController_createBodyInterface | undefined;
    empty?: boolean;
  }) {
    this.packageId = build({
      key: params?.data?.packageId,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<AiChatTenantController_createBodyInterface>): void {
    if (data.packageId !== undefined)
      this.packageId.hydrate(data.packageId as never);
  }

  reset(): void {
    this.hydrate(
      new AiChatTenantController_createBody({
        empty: true,
      }).bundle() as Partial<AiChatTenantController_createBodyInterface>,
    );
  }

  bundle() {
    return bundleInputs({ packageId: this.packageId });
  }
}
export type AiChatTenantController_listResponseInterface = AiChatInterface[];

export class AiChatTenantController_listResponse {
  data = $state<AiChat[]>([]);

  constructor(params?: {
    data?: AiChatTenantController_listResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data = params?.data?.map((item) => new AiChat({ data: item })) ?? [];
  }

  static from(data: AiChatTenantController_listResponseInterface) {
    return data.map((item) => new AiChat({ data: item }));
  }

  bundle(): AiChatTenantController_listResponseInterface {
    return this.data.map((item) => item.bundle());
  }
}
