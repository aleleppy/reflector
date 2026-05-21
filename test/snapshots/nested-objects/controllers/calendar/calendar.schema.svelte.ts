import { build, BuildedInput, bundleStrict } from "$reflector/reflector.svelte";
import { validateInputs } from "$lib/sanitizers/validateFormats";
import { PUBLIC_ENVIRONMENT } from "$env/static/public";
const isEmpty = PUBLIC_ENVIRONMENT !== "DEV";

export interface CalendarController_getResponseInterface {
  mes: number;
  calendario: CalendarController_getResponseCalendarioInterface[];
  refItems: RefItemInterface[];
  tags: string[];
  empresa: CalendarController_getResponseEmpresaInterface;
}
export class CalendarController_getResponse {
  mes: BuildedInput<number>;
  calendario = $state<CalendarController_getResponseCalendario[]>([]);
  refItems = $state<RefItem[]>([]);
  tags = $state<string[]>([]);
  empresa = $state<CalendarController_getResponseEmpresa>(
    new CalendarController_getResponseEmpresa(),
  );

  constructor(params?: {
    data?: CalendarController_getResponseInterface | undefined;
    empty?: boolean;
  }) {
    this.mes = build({
      key: params?.data?.mes,
      placeholder: 1,
      example: params?.empty || isEmpty ? 1 : 1,
      required: true,
    });
    this.calendario =
      params?.data?.calendario != null
        ? params.data.calendario.map(
            (param) =>
              new CalendarController_getResponseCalendario({ data: param }),
          )
        : params?.data?.calendario === null
          ? []
          : [];
    this.refItems =
      params?.data?.refItems != null
        ? params.data.refItems.map((param) => new RefItem({ data: param }))
        : params?.data?.refItems === null
          ? []
          : [];
    this.tags =
      params?.data?.tags != null
        ? params.data.tags
        : params?.data?.tags === null
          ? []
          : [];
    this.empresa = new CalendarController_getResponseEmpresa({
      data: params?.data?.empresa,
    });
  }

  static from(data: string[]) {
    return data.map((obj) => obj);
  }

  bundle() {
    return bundleStrict({
      mes: this.mes?.value,
      calendario: this.calendario.map((obj) => obj.bundle()),
      refItems: this.refItems.map((obj) => obj.bundle()),
      tags: this.tags,
      empresa: this.empresa?.bundle(),
    });
  }
}

export interface RefItemInterface {
  id: string;
}
export class RefItem {
  id: BuildedInput<string>;

  constructor(params?: {
    data?: RefItemInterface | undefined;
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

export interface CalendarController_getResponseCalendarioInterface {
  dia: string;
  tipo: string;
  dataIso: string;
}
export class CalendarController_getResponseCalendario {
  dia: BuildedInput<string>;
  tipo: BuildedInput<string>;
  dataIso: BuildedInput<string>;

  constructor(params?: {
    data?: CalendarController_getResponseCalendarioInterface | undefined;
    empty?: boolean;
  }) {
    this.dia = build({
      key: params?.data?.dia,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.tipo = build({
      key: params?.data?.tipo,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
    this.dataIso = build({
      key: params?.data?.dataIso,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  bundle() {
    return bundleStrict({
      dia: this.dia?.value,
      tipo: this.tipo?.value,
      dataIso: this.dataIso?.value,
    });
  }
}

export interface CalendarController_getResponseEmpresaInterface {
  id: number;
  cnpj: string;
}
export class CalendarController_getResponseEmpresa {
  id: BuildedInput<number>;
  cnpj: BuildedInput<string>;

  constructor(params?: {
    data?: CalendarController_getResponseEmpresaInterface | undefined;
    empty?: boolean;
  }) {
    this.id = build({
      key: params?.data?.id,
      placeholder: 1,
      example: params?.empty || isEmpty ? 1 : 1,
      required: true,
    });
    this.cnpj = build({
      key: params?.data?.cnpj,
      placeholder: "",
      example: params?.empty || isEmpty ? "" : "",
      required: true,
      validator: validateInputs.emptyString,
    });
  }

  bundle() {
    return bundleStrict({ id: this.id?.value, cnpj: this.cnpj?.value });
  }
}
