import {
  build,
  BuildedInput,
  bundleStrict,
  bundleInputs,
} from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface OrderInterface {
  id: string;
}
export class Order {
  id: BuildedInput<string>;

  constructor(params?: { data?: OrderInterface | undefined; empty?: boolean }) {
    this.id = build({
      key: params?.data?.id,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<OrderInterface>): void {
    if (data.id !== undefined) this.id.hydrate(data.id as never);
  }

  reset(): void {
    this.hydrate(
      new Order({ empty: true }).bundle() as Partial<OrderInterface>,
    );
  }

  bundle() {
    return bundleStrict({ id: this.id?.value });
  }
}

export interface OrderController_createBodyInterface {
  name: string;
  shipping: ShippingInfoInterface;
  billing?: BillingInfoInterface;
  coupon?: CouponInfoInterface | null;
  audit: AuditInfoInterface;
}
export class OrderController_createBody {
  name: BuildedInput<string>;
  shipping = $state<ShippingInfo>(new ShippingInfo());
  billing? = $state<BillingInfo>(new BillingInfo());
  coupon? = $state<CouponInfo | null>(null);
  audit = $state<AuditInfo>(new AuditInfo());
  readonly _optionalDtos = new Set<string>(["billing"]);

  constructor(params?: {
    data?: OrderController_createBodyInterface | undefined;
    empty?: boolean;
  }) {
    this.name = build({
      key: params?.data?.name,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.shipping = new ShippingInfo({ data: params?.data?.shipping });
    this.billing = new BillingInfo({ data: params?.data?.billing });
    this.coupon =
      params?.data?.coupon != null
        ? new CouponInfo({ data: params.data.coupon })
        : params?.data?.coupon === null
          ? null
          : new CouponInfo();
    this.audit = new AuditInfo({ data: params?.data?.audit });
  }

  hydrate(data: Partial<OrderController_createBodyInterface>): void {
    if (data.name !== undefined) this.name.hydrate(data.name as never);
    if (data.shipping !== undefined) {
      if (this.shipping) this.shipping.hydrate(data.shipping as never);
      else this.shipping = new ShippingInfo({ data: data.shipping as never });
    }
    if (data.billing !== undefined) {
      if (this.billing) this.billing.hydrate(data.billing as never);
      else this.billing = new BillingInfo({ data: data.billing as never });
    }
    if (data.coupon !== undefined) {
      if (data.coupon === null) this.coupon = null;
      else if (this.coupon) this.coupon.hydrate(data.coupon as never);
      else this.coupon = new CouponInfo({ data: data.coupon as never });
    }
    if (data.audit !== undefined) {
      if (this.audit) this.audit.hydrate(data.audit as never);
      else this.audit = new AuditInfo({ data: data.audit as never });
    }
  }

  reset(): void {
    this.hydrate(
      new OrderController_createBody({
        empty: true,
      }).bundle() as Partial<OrderController_createBodyInterface>,
    );
  }

  bundle() {
    return bundleInputs({
      name: this.name,
      shipping: this.shipping,
      billing: this.billing,
      coupon: this.coupon,
      audit: this.audit,
    });
  }
}

export interface AuditInfoInterface {
  createdBy: string;
}
export class AuditInfo {
  createdBy: BuildedInput<string>;

  constructor(params?: {
    data?: AuditInfoInterface | undefined;
    empty?: boolean;
  }) {
    this.createdBy = build({
      key: params?.data?.createdBy,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<AuditInfoInterface>): void {
    if (data.createdBy !== undefined)
      this.createdBy.hydrate(data.createdBy as never);
  }

  reset(): void {
    this.hydrate(
      new AuditInfo({ empty: true }).bundle() as Partial<AuditInfoInterface>,
    );
  }

  bundle() {
    return bundleInputs({ createdBy: this.createdBy });
  }
}

export interface CouponInfoInterface {
  code: string;
}
export class CouponInfo {
  code: BuildedInput<string>;

  constructor(params?: {
    data?: CouponInfoInterface | undefined;
    empty?: boolean;
  }) {
    this.code = build({
      key: params?.data?.code,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<CouponInfoInterface>): void {
    if (data.code !== undefined) this.code.hydrate(data.code as never);
  }

  reset(): void {
    this.hydrate(
      new CouponInfo({ empty: true }).bundle() as Partial<CouponInfoInterface>,
    );
  }

  bundle() {
    return bundleInputs({ code: this.code });
  }
}

export interface BillingInfoInterface {
  cardNumber: string;
  holder: string | null;
}
export class BillingInfo {
  cardNumber: BuildedInput<string>;
  holder: BuildedInput<string | null>;

  constructor(params?: {
    data?: BillingInfoInterface | undefined;
    empty?: boolean;
  }) {
    this.cardNumber = build({
      key: params?.data?.cardNumber,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.holder = build<string | null>({
      key: params?.data?.holder ?? null,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: false,
    });
  }

  hydrate(data: Partial<BillingInfoInterface>): void {
    if (data.cardNumber !== undefined)
      this.cardNumber.hydrate(data.cardNumber as never);
    if (data.holder !== undefined) this.holder.hydrate(data.holder as never);
  }

  reset(): void {
    this.hydrate(
      new BillingInfo({
        empty: true,
      }).bundle() as Partial<BillingInfoInterface>,
    );
  }

  bundle() {
    return bundleInputs({ cardNumber: this.cardNumber, holder: this.holder });
  }
}

export interface ShippingInfoInterface {
  address: string;
}
export class ShippingInfo {
  address: BuildedInput<string>;

  constructor(params?: {
    data?: ShippingInfoInterface | undefined;
    empty?: boolean;
  }) {
    this.address = build({
      key: params?.data?.address,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<ShippingInfoInterface>): void {
    if (data.address !== undefined) this.address.hydrate(data.address as never);
  }

  reset(): void {
    this.hydrate(
      new ShippingInfo({
        empty: true,
      }).bundle() as Partial<ShippingInfoInterface>,
    );
  }

  bundle() {
    return bundleInputs({ address: this.address });
  }
}
