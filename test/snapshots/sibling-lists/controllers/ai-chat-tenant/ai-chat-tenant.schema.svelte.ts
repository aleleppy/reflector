import { build, BuildedInput, bundleStrict } from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

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
