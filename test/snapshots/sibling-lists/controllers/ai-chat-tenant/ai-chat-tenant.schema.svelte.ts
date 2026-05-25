import { build, BuildedInput, bundleStrict } from "$reflector/reflector.svelte";
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

  bundle() {
    return bundleStrict({ packageId: this.packageId?.value });
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
