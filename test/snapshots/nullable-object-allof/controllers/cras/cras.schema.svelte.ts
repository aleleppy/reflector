import {
  build,
  BuildedInput,
  bundleStrict,
  bundleInputs,
} from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface CrasInterface {
  id: string;
  responsible?: DefaultCrasResponsibleResInterface | null;
}
export class Cras {
  id: BuildedInput<string>;
  responsible? = $state<DefaultCrasResponsibleRes | null>(null);

  constructor(params?: { data?: CrasInterface | undefined; empty?: boolean }) {
    this.id = build({
      key: params?.data?.id,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.responsible =
      params?.data?.responsible != null
        ? new DefaultCrasResponsibleRes({ data: params.data.responsible })
        : params?.data?.responsible === null
          ? null
          : new DefaultCrasResponsibleRes();
  }

  hydrate(data: Partial<CrasInterface>): void {
    if (data.id !== undefined) this.id.hydrate(data.id as never);
    if (data.responsible !== undefined) {
      if (data.responsible === null) this.responsible = null;
      else if (this.responsible)
        this.responsible.hydrate(data.responsible as never);
      else
        this.responsible = new DefaultCrasResponsibleRes({
          data: data.responsible as never,
        });
    }
  }

  reset(): void {
    this.hydrate(new Cras({ empty: true }).bundle() as Partial<CrasInterface>);
  }

  bundle() {
    return bundleStrict({
      id: this.id?.value,
      responsible: this.responsible?.bundle() ?? null,
    });
  }
}

export interface DefaultCrasResponsibleResInterface {
  name: string;
  email: string;
}
export class DefaultCrasResponsibleRes {
  name: BuildedInput<string>;
  email: BuildedInput<string>;

  constructor(params?: {
    data?: DefaultCrasResponsibleResInterface | undefined;
    empty?: boolean;
  }) {
    this.name = build({
      key: params?.data?.name,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.email = build({
      key: params?.data?.email,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<DefaultCrasResponsibleResInterface>): void {
    if (data.name !== undefined) this.name.hydrate(data.name as never);
    if (data.email !== undefined) this.email.hydrate(data.email as never);
  }

  reset(): void {
    this.hydrate(
      new DefaultCrasResponsibleRes({
        empty: true,
      }).bundle() as Partial<DefaultCrasResponsibleResInterface>,
    );
  }

  bundle() {
    return bundleInputs({ name: this.name, email: this.email });
  }
}

export interface CrasController_createBodyInterface {
  name: string;
  meta: string | null;
  responsible?: DefaultCrasResponsibleResInterface | null;
  owner: CrasOwnerInterface | null;
  manager?: CrasManagerInterface;
  shipping: CrasShippingInterface;
  coupon?: CrasCouponInterface | null;
}
export class CrasController_createBody {
  name: BuildedInput<string>;
  meta: BuildedInput<string | null>;
  responsible? = $state<DefaultCrasResponsibleRes | null>(null);
  owner = $state<CrasOwner | null>(null);
  manager? = $state<CrasManager>(new CrasManager());
  shipping = $state<CrasShipping>(new CrasShipping());
  coupon? = $state<CrasCoupon | null>(null);
  readonly _optionalDtos = new Set<string>(["manager"]);

  constructor(params?: {
    data?: CrasController_createBodyInterface | undefined;
    empty?: boolean;
  }) {
    this.name = build({
      key: params?.data?.name,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.meta = build<string | null>({
      key: params?.data?.meta ?? null,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: false,
    });
    this.responsible =
      params?.data?.responsible != null
        ? new DefaultCrasResponsibleRes({ data: params.data.responsible })
        : params?.data?.responsible === null
          ? null
          : new DefaultCrasResponsibleRes();
    this.owner =
      params?.data?.owner != null
        ? new CrasOwner({ data: params.data.owner })
        : params?.data?.owner === null
          ? null
          : new CrasOwner();
    this.manager = new CrasManager({ data: params?.data?.manager });
    this.shipping = new CrasShipping({ data: params?.data?.shipping });
    this.coupon =
      params?.data?.coupon != null
        ? new CrasCoupon({ data: params.data.coupon })
        : params?.data?.coupon === null
          ? null
          : new CrasCoupon();
  }

  hydrate(data: Partial<CrasController_createBodyInterface>): void {
    if (data.name !== undefined) this.name.hydrate(data.name as never);
    if (data.meta !== undefined) this.meta.hydrate(data.meta as never);
    if (data.responsible !== undefined) {
      if (data.responsible === null) this.responsible = null;
      else if (this.responsible)
        this.responsible.hydrate(data.responsible as never);
      else
        this.responsible = new DefaultCrasResponsibleRes({
          data: data.responsible as never,
        });
    }
    if (data.owner !== undefined) {
      if (data.owner === null) this.owner = null;
      else if (this.owner) this.owner.hydrate(data.owner as never);
      else this.owner = new CrasOwner({ data: data.owner as never });
    }
    if (data.manager !== undefined) {
      if (this.manager) this.manager.hydrate(data.manager as never);
      else this.manager = new CrasManager({ data: data.manager as never });
    }
    if (data.shipping !== undefined) {
      if (this.shipping) this.shipping.hydrate(data.shipping as never);
      else this.shipping = new CrasShipping({ data: data.shipping as never });
    }
    if (data.coupon !== undefined) {
      if (data.coupon === null) this.coupon = null;
      else if (this.coupon) this.coupon.hydrate(data.coupon as never);
      else this.coupon = new CrasCoupon({ data: data.coupon as never });
    }
  }

  reset(): void {
    this.hydrate(
      new CrasController_createBody({
        empty: true,
      }).bundle() as Partial<CrasController_createBodyInterface>,
    );
  }

  bundle() {
    return bundleInputs(
      {
        name: this.name,
        meta: this.meta,
        responsible: this.responsible,
        owner: this.owner,
        manager: this.manager,
        shipping: this.shipping,
        coupon: this.coupon,
      },
      this._optionalDtos,
    );
  }
}

export interface CrasCouponInterface {
  code: string;
}
export class CrasCoupon {
  code: BuildedInput<string>;

  constructor(params?: {
    data?: CrasCouponInterface | undefined;
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

  hydrate(data: Partial<CrasCouponInterface>): void {
    if (data.code !== undefined) this.code.hydrate(data.code as never);
  }

  reset(): void {
    this.hydrate(
      new CrasCoupon({ empty: true }).bundle() as Partial<CrasCouponInterface>,
    );
  }

  bundle() {
    return bundleInputs({ code: this.code });
  }
}

export interface CrasShippingInterface {
  address: string;
}
export class CrasShipping {
  address: BuildedInput<string>;

  constructor(params?: {
    data?: CrasShippingInterface | undefined;
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

  hydrate(data: Partial<CrasShippingInterface>): void {
    if (data.address !== undefined) this.address.hydrate(data.address as never);
  }

  reset(): void {
    this.hydrate(
      new CrasShipping({
        empty: true,
      }).bundle() as Partial<CrasShippingInterface>,
    );
  }

  bundle() {
    return bundleInputs({ address: this.address });
  }
}

export interface CrasManagerInterface {
  login: string;
}
export class CrasManager {
  login: BuildedInput<string>;

  constructor(params?: {
    data?: CrasManagerInterface | undefined;
    empty?: boolean;
  }) {
    this.login = build({
      key: params?.data?.login,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<CrasManagerInterface>): void {
    if (data.login !== undefined) this.login.hydrate(data.login as never);
  }

  reset(): void {
    this.hydrate(
      new CrasManager({
        empty: true,
      }).bundle() as Partial<CrasManagerInterface>,
    );
  }

  bundle() {
    return bundleInputs({ login: this.login });
  }
}

export interface CrasOwnerInterface {
  document: string;
}
export class CrasOwner {
  document: BuildedInput<string>;

  constructor(params?: {
    data?: CrasOwnerInterface | undefined;
    empty?: boolean;
  }) {
    this.document = build({
      key: params?.data?.document,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  hydrate(data: Partial<CrasOwnerInterface>): void {
    if (data.document !== undefined)
      this.document.hydrate(data.document as never);
  }

  reset(): void {
    this.hydrate(
      new CrasOwner({ empty: true }).bundle() as Partial<CrasOwnerInterface>,
    );
  }

  bundle() {
    return bundleInputs({ document: this.document });
  }
}
