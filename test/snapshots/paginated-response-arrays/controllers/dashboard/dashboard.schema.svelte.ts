import { build, BuildedInput, bundleStrict } from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface CustomerDashboardResponseInterface {
  data: PurchaseResInterface[];
  favoriteProducts: FavoriteProductResInterface[];
  paymentMethods: PaymentMethodShareResInterface[];
}
export class CustomerDashboardResponse {
  data = $state<PurchaseRes[]>([]);
  favoriteProducts = $state<FavoriteProductRes[]>([]);
  paymentMethods = $state<PaymentMethodShareRes[]>([]);

  constructor(params?: {
    data?: CustomerDashboardResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data =
      params?.data?.data != null
        ? params.data.data.map((param) => new PurchaseRes({ data: param }))
        : params?.data?.data === null
          ? []
          : [];
    this.favoriteProducts =
      params?.data?.favoriteProducts != null
        ? params.data.favoriteProducts.map(
            (param) => new FavoriteProductRes({ data: param }),
          )
        : params?.data?.favoriteProducts === null
          ? []
          : [];
    this.paymentMethods =
      params?.data?.paymentMethods != null
        ? params.data.paymentMethods.map(
            (param) => new PaymentMethodShareRes({ data: param }),
          )
        : params?.data?.paymentMethods === null
          ? []
          : [];
  }

  static from(data: PurchaseResInterface[]) {
    return data.map((obj) => new PurchaseRes({ data: obj }));
  }

  hydrate(data: Partial<CustomerDashboardResponseInterface>): void {
    if (data.data !== undefined)
      this.data = (data.data ?? []).map(
        (i) => new PurchaseRes({ data: i as never }),
      );
    if (data.favoriteProducts !== undefined)
      this.favoriteProducts = (data.favoriteProducts ?? []).map(
        (i) => new FavoriteProductRes({ data: i as never }),
      );
    if (data.paymentMethods !== undefined)
      this.paymentMethods = (data.paymentMethods ?? []).map(
        (i) => new PaymentMethodShareRes({ data: i as never }),
      );
  }

  reset(): void {
    this.hydrate(
      new CustomerDashboardResponse({
        empty: true,
      }).bundle() as Partial<CustomerDashboardResponseInterface>,
    );
  }

  bundle() {
    return bundleStrict({
      data: this.data.map((obj) => obj.bundle()),
      favoriteProducts: this.favoriteProducts.map((obj) => obj.bundle()),
      paymentMethods: this.paymentMethods.map((obj) => obj.bundle()),
    });
  }
}

export interface PaymentMethodShareResInterface {
  name: string;
}
export class PaymentMethodShareRes {
  name: BuildedInput<string>;

  constructor(params?: {
    data?: PaymentMethodShareResInterface | undefined;
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

  hydrate(data: Partial<PaymentMethodShareResInterface>): void {
    if (data.name !== undefined) this.name.hydrate(data.name as never);
  }

  reset(): void {
    this.hydrate(
      new PaymentMethodShareRes({
        empty: true,
      }).bundle() as Partial<PaymentMethodShareResInterface>,
    );
  }

  bundle() {
    return bundleStrict({ name: this.name?.value });
  }
}

export interface FavoriteProductResInterface {
  id: string;
}
export class FavoriteProductRes {
  id: BuildedInput<string>;

  constructor(params?: {
    data?: FavoriteProductResInterface | undefined;
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

  hydrate(data: Partial<FavoriteProductResInterface>): void {
    if (data.id !== undefined) this.id.hydrate(data.id as never);
  }

  reset(): void {
    this.hydrate(
      new FavoriteProductRes({
        empty: true,
      }).bundle() as Partial<FavoriteProductResInterface>,
    );
  }

  bundle() {
    return bundleStrict({ id: this.id?.value });
  }
}

export interface PurchaseResInterface {
  id: string;
}
export class PurchaseRes {
  id: BuildedInput<string>;

  constructor(params?: {
    data?: PurchaseResInterface | undefined;
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

  hydrate(data: Partial<PurchaseResInterface>): void {
    if (data.id !== undefined) this.id.hydrate(data.id as never);
  }

  reset(): void {
    this.hydrate(
      new PurchaseRes({
        empty: true,
      }).bundle() as Partial<PurchaseResInterface>,
    );
  }

  bundle() {
    return bundleStrict({ id: this.id?.value });
  }
}

export interface SimplePurchaseResponseInterface {
  data: PurchaseResInterface[];
}
export class SimplePurchaseResponse {
  data = $state<PurchaseRes[]>([]);

  constructor(params?: {
    data?: SimplePurchaseResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.data =
      params?.data?.data != null
        ? params.data.data.map((param) => new PurchaseRes({ data: param }))
        : params?.data?.data === null
          ? []
          : [];
  }

  static from(data: PurchaseResInterface[]) {
    return data.map((obj) => new PurchaseRes({ data: obj }));
  }

  hydrate(data: Partial<SimplePurchaseResponseInterface>): void {
    if (data.data !== undefined)
      this.data = (data.data ?? []).map(
        (i) => new PurchaseRes({ data: i as never }),
      );
  }

  reset(): void {
    this.hydrate(
      new SimplePurchaseResponse({
        empty: true,
      }).bundle() as Partial<SimplePurchaseResponseInterface>,
    );
  }

  bundle() {
    return bundleStrict({ data: this.data.map((obj) => obj.bundle()) });
  }
}
