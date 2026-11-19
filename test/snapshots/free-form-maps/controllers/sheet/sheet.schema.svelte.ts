import {
  build,
  BuildedInput,
  bundleStrict,
  untouchForm,
} from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface SheetInterface {
  name: string;
  rows: Record<string, unknown>[];
  bareRows?: Record<string, unknown>[];
  columnGroups?: Record<string, SheetColumnInterface>[];
  columnsByKey: Record<string, SheetColumnInterface>;
  totals?: Record<string, number>;
}
export class Sheet {
  name: BuildedInput<string>;
  rows = $state<Record<string, unknown>[]>([]);
  bareRows? = $state<Record<string, unknown>[]>([]);
  columnGroups? = $state<Record<string, SheetColumnInterface>[]>([]);
  columnsByKey = $state<Record<string, SheetColumnInterface>>();
  totals? = $state<Record<string, number>>();

  constructor(params?: { data?: SheetInterface | undefined; empty?: boolean }) {
    this.name = build({
      key: params?.data?.name,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.rows =
      params?.data?.rows != null
        ? params.data.rows
        : params?.data?.rows === null
          ? []
          : [];
    this.bareRows =
      params?.data?.bareRows != null
        ? params.data.bareRows
        : params?.data?.bareRows === null
          ? []
          : [];
    this.columnGroups =
      params?.data?.columnGroups != null
        ? params.data.columnGroups
        : params?.data?.columnGroups === null
          ? []
          : [];
    this.columnsByKey = params?.data?.columnsByKey;
    this.totals = params?.data?.totals;
  }

  static from(data: Record<string, SheetColumnInterface>[]) {
    return data.map((obj) => obj);
  }

  hydrate(data: Partial<SheetInterface>): void {
    if (data.name !== undefined) this.name.hydrate(data.name as never);
    if (data.rows !== undefined) this.rows = data.rows ?? [];
    if (data.bareRows !== undefined) this.bareRows = data.bareRows ?? [];
    if (data.columnGroups !== undefined)
      this.columnGroups = data.columnGroups ?? [];
    if (data.columnsByKey !== undefined) this.columnsByKey = data.columnsByKey;
    if (data.totals !== undefined) this.totals = data.totals;
  }

  reset(): void {
    this.hydrate(
      new Sheet({ empty: true }).bundle() as Partial<SheetInterface>,
    );
    untouchForm(this);
  }

  bundle() {
    return bundleStrict({
      name: this.name?.value,
      rows: this.rows,
      bareRows: this.bareRows,
      columnGroups: this.columnGroups,
      columnsByKey: this.columnsByKey,
      totals: this.totals,
    });
  }
}

export interface SheetColumnInterface {
  key: string;
  labels?: Record<string, string> | null;
}
export class SheetColumn {
  key: BuildedInput<string>;
  labels? = $state<Record<string, string> | null>();

  constructor(params?: {
    data?: SheetColumnInterface | undefined;
    empty?: boolean;
  }) {
    this.key = build({
      key: params?.data?.key,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.labels = params?.data?.labels;
  }

  hydrate(data: Partial<SheetColumnInterface>): void {
    if (data.key !== undefined) this.key.hydrate(data.key as never);
    if (data.labels !== undefined) this.labels = data.labels;
  }

  reset(): void {
    this.hydrate(
      new SheetColumn({
        empty: true,
      }).bundle() as Partial<SheetColumnInterface>,
    );
    untouchForm(this);
  }

  bundle() {
    return bundleStrict({ key: this.key?.value, labels: this.labels });
  }
}
