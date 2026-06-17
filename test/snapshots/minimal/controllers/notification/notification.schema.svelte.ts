import { build, BuildedInput, bundleStrict } from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import type { ENUM_NOTIFICATION_ENTITY_ACTION } from "$reflector/enums";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";
export type NotificationController_listResponseInterface =
  NotificationInterface[];

export class NotificationController_listResponse {
  data = $state<Notification[]>([]);

  constructor(params?: {
    data?: NotificationController_listResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data =
      params?.data?.map((item) => new Notification({ data: item })) ?? [];
  }

  static from(data: NotificationController_listResponseInterface) {
    return data.map((item) => new Notification({ data: item }));
  }

  bundle(): NotificationController_listResponseInterface {
    return this.data.map((item) => item.bundle());
  }
}

export type NotificationInterface = {
  id: string;
  title: string | null;
} & (
  | { action: "USER_CREATED" | "USER_UPDATED"; actionMeta: UserMetaInterface }
  | { action: "STOCK_LOW" | "STOCK_OUT"; actionMeta: StockMetaInterface }
);
export class Notification {
  id: BuildedInput<string>;
  title: BuildedInput<string | null>;
  action: BuildedInput<ENUM_NOTIFICATION_ENTITY_ACTION>;
  actionMeta = $state<UserMetaInterface | StockMetaInterface>();

  constructor(params?: {
    data?: NotificationInterface | undefined;
    empty?: boolean;
  }) {
    this.id = build({
      key: params?.data?.id,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.title = build<string | null>({
      key: params?.data?.title ?? null,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: false,
      nullable: true,
    });
    this.action = build({
      key: params?.data?.action,
      placeholder: "USER_CREATED",
      example: "USER_CREATED",
      required: true,
    });
    this.actionMeta = params?.data?.actionMeta;
  }

  hydrate(data: Partial<NotificationInterface>): void {
    if (data.id !== undefined) this.id.hydrate(data.id as never);
    if (data.title !== undefined) this.title.hydrate(data.title as never);
    if (data.action !== undefined) this.action.hydrate(data.action as never);
    if (data.actionMeta !== undefined) this.actionMeta = data.actionMeta;
  }

  reset(): void {
    this.hydrate(
      new Notification({
        empty: true,
      }).bundle() as Partial<NotificationInterface>,
    );
  }

  bundle() {
    return bundleStrict({
      id: this.id?.value,
      title: this.title?.value,
      action: this.action?.value,
      actionMeta: this.actionMeta,
    }) as NotificationInterface;
  }

  discriminated(): NotificationInterface {
    return this.bundle();
  }
}

export interface StockMetaInterface {
  productId: string;
  quantity: number;
}
export class StockMeta {
  productId: BuildedInput<string>;
  quantity: BuildedInput<number>;

  constructor(params?: {
    data?: StockMetaInterface | undefined;
    empty?: boolean;
  }) {
    this.productId = build({
      key: params?.data?.productId,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.quantity = build({
      key: params?.data?.quantity,
      placeholder: 1,
      example: params?.empty || isEmpty ? 1 : 1,
      required: true,
    });
  }

  hydrate(data: Partial<StockMetaInterface>): void {
    if (data.productId !== undefined)
      this.productId.hydrate(data.productId as never);
    if (data.quantity !== undefined)
      this.quantity.hydrate(data.quantity as never);
  }

  reset(): void {
    this.hydrate(
      new StockMeta({ empty: true }).bundle() as Partial<StockMetaInterface>,
    );
  }

  bundle() {
    return bundleStrict({
      productId: this.productId?.value,
      quantity: this.quantity?.value,
    });
  }
}

export interface UserMetaInterface {
  userId: string;
}
export class UserMeta {
  userId: BuildedInput<string>;

  constructor(params?: {
    data?: UserMetaInterface | undefined;
    empty?: boolean;
  }) {
    this.userId = build({
      key: params?.data?.userId,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<UserMetaInterface>): void {
    if (data.userId !== undefined) this.userId.hydrate(data.userId as never);
  }

  reset(): void {
    this.hydrate(
      new UserMeta({ empty: true }).bundle() as Partial<UserMetaInterface>,
    );
  }

  bundle() {
    return bundleStrict({ userId: this.userId?.value });
  }
}
