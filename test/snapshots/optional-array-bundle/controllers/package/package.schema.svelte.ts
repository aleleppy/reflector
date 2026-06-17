import {
  build,
  BuildedInput,
  bundleStrict,
  bundleInputs,
} from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface PackageViewInterface {
  name: string;
  requiredItems: PackageItemInterface[];
  optionalItems?: PackageItemInterface[];
  nullableItems: PackageItemInterface[] | null;
  optionalNullableItems?: PackageItemInterface[] | null;
  tags?: string[];
}
export class PackageView {
  name: BuildedInput<string>;
  requiredItems = $state<PackageItem[]>([]);
  optionalItems? = $state<PackageItem[]>([]);
  nullableItems = $state<PackageItem[] | null>(null);
  optionalNullableItems? = $state<PackageItem[] | null>(null);
  tags? = $state<string[]>([]);

  constructor(params?: {
    data?: PackageViewInterface | undefined;
    empty?: boolean;
  }) {
    this.name = build({
      key: params?.data?.name,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.requiredItems =
      params?.data?.requiredItems != null
        ? params.data.requiredItems.map(
            (param) => new PackageItem({ data: param }),
          )
        : params?.data?.requiredItems === null
          ? []
          : [];
    this.optionalItems =
      params?.data?.optionalItems != null
        ? params.data.optionalItems.map(
            (param) => new PackageItem({ data: param }),
          )
        : params?.data?.optionalItems === null
          ? []
          : [];
    this.nullableItems =
      params?.data?.nullableItems != null
        ? params.data.nullableItems.map(
            (param) => new PackageItem({ data: param }),
          )
        : params?.data?.nullableItems === null
          ? null
          : [];
    this.optionalNullableItems =
      params?.data?.optionalNullableItems != null
        ? params.data.optionalNullableItems.map(
            (param) => new PackageItem({ data: param }),
          )
        : params?.data?.optionalNullableItems === null
          ? null
          : [];
    this.tags =
      params?.data?.tags != null
        ? params.data.tags
        : params?.data?.tags === null
          ? []
          : [];
  }

  static from(data: string[]) {
    return data.map((obj) => obj);
  }

  hydrate(data: Partial<PackageViewInterface>): void {
    if (data.name !== undefined) this.name.hydrate(data.name as never);
    if (data.requiredItems !== undefined)
      this.requiredItems = (data.requiredItems ?? []).map(
        (i) => new PackageItem({ data: i as never }),
      );
    if (data.optionalItems !== undefined)
      this.optionalItems = (data.optionalItems ?? []).map(
        (i) => new PackageItem({ data: i as never }),
      );
    if (data.nullableItems !== undefined)
      this.nullableItems = (data.nullableItems ?? []).map(
        (i) => new PackageItem({ data: i as never }),
      );
    if (data.optionalNullableItems !== undefined)
      this.optionalNullableItems = (data.optionalNullableItems ?? []).map(
        (i) => new PackageItem({ data: i as never }),
      );
    if (data.tags !== undefined) this.tags = data.tags ?? [];
  }

  reset(): void {
    this.hydrate(
      new PackageView({
        empty: true,
      }).bundle() as Partial<PackageViewInterface>,
    );
  }

  bundle() {
    return bundleStrict({
      name: this.name?.value,
      requiredItems: this.requiredItems.map((obj) => obj.bundle()),
      optionalItems: this.optionalItems?.map((obj) => obj.bundle()),
      nullableItems:
        this.nullableItems == null
          ? this.nullableItems
          : this.nullableItems.map((obj) => obj.bundle()),
      optionalNullableItems:
        this.optionalNullableItems == null
          ? this.optionalNullableItems
          : this.optionalNullableItems.map((obj) => obj.bundle()),
      tags: this.tags,
    });
  }
}

export interface PackageItemInterface {
  id: string;
}
export class PackageItem {
  id: BuildedInput<string>;

  constructor(params?: {
    data?: PackageItemInterface | undefined;
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

  hydrate(data: Partial<PackageItemInterface>): void {
    if (data.id !== undefined) this.id.hydrate(data.id as never);
  }

  reset(): void {
    this.hydrate(
      new PackageItem({
        empty: true,
      }).bundle() as Partial<PackageItemInterface>,
    );
  }

  bundle() {
    return bundleInputs({ id: this.id });
  }
}

export interface BatchCreatePackageDtoInterface {
  name: string;
  requiredItems: PackageItemInterface[];
  optionalItems?: PackageItemInterface[];
  nullableItems: PackageItemInterface[] | null;
  optionalNullableItems?: PackageItemInterface[] | null;
  tags?: string[];
}
export class BatchCreatePackageDto {
  name: BuildedInput<string>;
  requiredItems = $state<PackageItem[]>([]);
  optionalItems? = $state<PackageItem[]>([]);
  nullableItems = $state<PackageItem[] | null>(null);
  optionalNullableItems? = $state<PackageItem[] | null>(null);
  tags? = $state<string[]>([]);

  constructor(params?: {
    data?: BatchCreatePackageDtoInterface | undefined;
    empty?: boolean;
  }) {
    this.name = build({
      key: params?.data?.name,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.requiredItems =
      params?.data?.requiredItems != null
        ? params.data.requiredItems.map(
            (param) => new PackageItem({ data: param }),
          )
        : params?.data?.requiredItems === null
          ? []
          : [];
    this.optionalItems =
      params?.data?.optionalItems != null
        ? params.data.optionalItems.map(
            (param) => new PackageItem({ data: param }),
          )
        : params?.data?.optionalItems === null
          ? []
          : [];
    this.nullableItems =
      params?.data?.nullableItems != null
        ? params.data.nullableItems.map(
            (param) => new PackageItem({ data: param }),
          )
        : params?.data?.nullableItems === null
          ? null
          : [];
    this.optionalNullableItems =
      params?.data?.optionalNullableItems != null
        ? params.data.optionalNullableItems.map(
            (param) => new PackageItem({ data: param }),
          )
        : params?.data?.optionalNullableItems === null
          ? null
          : [];
    this.tags =
      params?.data?.tags != null
        ? params.data.tags
        : params?.data?.tags === null
          ? []
          : [];
  }

  static from(data: string[]) {
    return data.map((obj) => obj);
  }

  hydrate(data: Partial<BatchCreatePackageDtoInterface>): void {
    if (data.name !== undefined) this.name.hydrate(data.name as never);
    if (data.requiredItems !== undefined)
      this.requiredItems = (data.requiredItems ?? []).map(
        (i) => new PackageItem({ data: i as never }),
      );
    if (data.optionalItems !== undefined)
      this.optionalItems = (data.optionalItems ?? []).map(
        (i) => new PackageItem({ data: i as never }),
      );
    if (data.nullableItems !== undefined)
      this.nullableItems = (data.nullableItems ?? []).map(
        (i) => new PackageItem({ data: i as never }),
      );
    if (data.optionalNullableItems !== undefined)
      this.optionalNullableItems = (data.optionalNullableItems ?? []).map(
        (i) => new PackageItem({ data: i as never }),
      );
    if (data.tags !== undefined) this.tags = data.tags ?? [];
  }

  reset(): void {
    this.hydrate(
      new BatchCreatePackageDto({
        empty: true,
      }).bundle() as Partial<BatchCreatePackageDtoInterface>,
    );
  }

  bundle() {
    return bundleInputs({
      name: this.name,
      requiredItems: this.requiredItems,
      optionalItems: this.optionalItems,
      nullableItems: this.nullableItems,
      optionalNullableItems: this.optionalNullableItems,
      tags: this.tags,
    });
  }
}
