import {
  build,
  BuildedInput,
  bundleStrict,
  untouchForm,
} from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import type {
  ENUM_REPORT_SUMMARY_ITEM_KIND,
  ENUM_REPORT_SUMMARY_ITEM_UNIT,
} from "$reflector/enums";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface ReportSummaryItemInterface {
  label: string;
  kind?: ENUM_REPORT_SUMMARY_ITEM_KIND;
  unit: ENUM_REPORT_SUMMARY_ITEM_UNIT;
  value: string | number;
  hint?: number | boolean | null;
  mixed: ReportMoneyInterface | "N/A" | "PENDING" | string[];
  opaque?: unknown;
  bag?: string | Record<string, number>;
}
export class ReportSummaryItem {
  label: BuildedInput<string>;
  kind?: BuildedInput<ENUM_REPORT_SUMMARY_ITEM_KIND>;
  unit: BuildedInput<ENUM_REPORT_SUMMARY_ITEM_UNIT>;
  value = $state<string | number>();
  hint? = $state<number | boolean | null>();
  mixed = $state<ReportMoneyInterface | "N/A" | "PENDING" | string[]>();
  opaque? = $state<unknown>();
  bag? = $state<string | Record<string, number>>();

  constructor(params?: {
    data?: ReportSummaryItemInterface | undefined;
    empty?: boolean;
  }) {
    this.label = build({
      key: params?.data?.label,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    if (params?.data?.kind !== undefined)
      this.kind = build({
        key: params?.data?.kind,
        placeholder: "text",
        example: "text",
        required: false,
      });
    this.unit = build({
      key: params?.data?.unit,
      placeholder: "BRL",
      example: "BRL",
      required: true,
    });
    this.value = params?.data?.value;
    this.hint = params?.data?.hint;
    this.mixed = params?.data?.mixed;
    this.opaque = params?.data?.opaque;
    this.bag = params?.data?.bag;
  }

  hydrate(data: Partial<ReportSummaryItemInterface>): void {
    if (data.label !== undefined) this.label.hydrate(data.label as never);
    if (data.kind !== undefined) {
      if (this.kind) this.kind.hydrate(data.kind as never);
      else
        this.kind = build({
          key: data.kind,
          placeholder: "text",
          example: "text",
          required: false,
        });
    }
    if (data.unit !== undefined) this.unit.hydrate(data.unit as never);
    if (data.value !== undefined) this.value = data.value;
    if (data.hint !== undefined) this.hint = data.hint;
    if (data.mixed !== undefined) this.mixed = data.mixed;
    if (data.opaque !== undefined) this.opaque = data.opaque;
    if (data.bag !== undefined) this.bag = data.bag;
  }

  reset(): void {
    this.hydrate(
      new ReportSummaryItem({
        empty: true,
      }).bundle() as Partial<ReportSummaryItemInterface>,
    );
    untouchForm(this);
  }

  bundle() {
    return bundleStrict({
      label: this.label?.value,
      kind: this.kind?.value,
      unit: this.unit?.value,
      value: this.value,
      hint: this.hint,
      mixed: this.mixed,
      opaque: this.opaque,
      bag: this.bag,
    });
  }
}

export interface ReportMoneyInterface {
  cents: number;
}
export class ReportMoney {
  cents: BuildedInput<number>;

  constructor(params?: {
    data?: ReportMoneyInterface | undefined;
    empty?: boolean;
  }) {
    this.cents = build({
      key: params?.data?.cents,
      placeholder: 1,
      example: params?.empty || isEmpty ? 1 : 1,
      required: true,
    });
  }

  hydrate(data: Partial<ReportMoneyInterface>): void {
    if (data.cents !== undefined) this.cents.hydrate(data.cents as never);
  }

  reset(): void {
    this.hydrate(
      new ReportMoney({
        empty: true,
      }).bundle() as Partial<ReportMoneyInterface>,
    );
    untouchForm(this);
  }

  bundle() {
    return bundleStrict({ cents: this.cents?.value });
  }
}
