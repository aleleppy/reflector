import { MethodEndpointBuilder } from "../method/MethodEndpointBuilder.js";
import type { AttributeProp } from "../../types/types.js";
import type { CallMethodInput, CallStrategy } from "./CallStrategy.js";
import { runIdField } from "./runGuard.js";

type StaleGuard = {
  /** State field the call writes. */
  field: string;
  /** Statement taking this call's id. */
  claim: string;
  /** Expression true while no newer call to the same field has started. */
  latest: string;
  /** Negation of `latest`. */
  stale: string;
};

export class CallMethodGenerator {
  private readonly endpointBuilder = new MethodEndpointBuilder();

  generate(method: CallMethodInput, strategy: CallStrategy): string {
    const description = `/** ${method.description ?? ""} */`;
    const endpoint = this.endpointBuilder.build(method.endpoint, method.analyzers.props.paths);
    const props = this.buildProps(method);
    const guard = this.buildGuard(method, strategy);
    const { inside, outside } = this.buildApiCall(method, strategy, guard);
    const methodReturn = this.buildMethodReturn(method, strategy);
    const signature = strategy.buildSignature(method, this.buildDataType(method));
    const legacyWrapper = strategy.buildLegacyWrapper(method);

    return `
      ${description}
      ${signature} {

        const behavior = params?.behavior ?? new Behavior();
        const { onError, onSuccess } = behavior;

        ${guard?.claim ?? ""}
        this.loading = true;
        ${props}
        const endpoint = ${endpoint}

        ${outside}

        try {
          ${inside}
          await onSuccess?.(response);

          return { ok: true, data: ${methodReturn} };
        } catch (e) {
          let parsedError: ApiErrorResponse;
          try {
            parsedError = JSON.parse((e as Error).message) as ApiErrorResponse;
          } catch {
            parsedError = { error: 'unknown', message: (e as Error).message ?? String(e) };
          }
          ${guard ? `if (${guard.stale}) return { ok: false, error: parsedError };
` : ""}await onError?.(parsedError);
          return { ok: false, error: parsedError };
        } finally {
          ${guard ? `if (${guard.latest}) this.loading = false;` : "this.loading = false;"}
        }
      }

      ${legacyWrapper}
    `;
  }

  /**
   * Calls that write a state field are guarded so a superseded call (one that
   * resolves after a newer call to the same field started) never overwrites it,
   * never clears `loading` and never fires behaviors — it only returns its own result.
   */
  private buildGuard(method: CallMethodInput, strategy: CallStrategy): StaleGuard | undefined {
    const field = this.writtenStateField(method, strategy);
    if (!field) return undefined;

    const counter = `this.${runIdField(field)}`;
    return {
      field,
      claim: `const thisRun = ++${counter};`,
      latest: `thisRun === ${counter}`,
      stale: `thisRun !== ${counter}`,
    };
  }

  private writtenStateField(method: CallMethodInput, strategy: CallStrategy): string | undefined {
    const { attributeType, responseType, isPrimitiveResponse } = method.analyzers.request;
    if (attributeType === "list") return strategy.listStateField(method);
    if (attributeType === "entity" && responseType && !isPrimitiveResponse) return strategy.entityStateField(method);
    return undefined;
  }

  private buildProps(method: CallMethodInput): string {
    const { querys, paths, cookies } = method.analyzers.props;
    const lines: string[] = [];

    if (querys.length > 0) {
      lines.push(`const { ${this.joinNames(querys)} } = params?.queryOverride ?? this.querys.bundle()`);
    }
    if (paths.length > 0) {
      lines.push(`const { ${this.joinNames(paths)} } = params?.paths ?? this.paths`);
    }
    if (cookies.length > 0) {
      lines.push(`const cookies = this.cookies`);
    }

    return lines.join("\n");
  }

  private buildApiCall(
    method: CallMethodInput,
    strategy: CallStrategy,
    guard: StaleGuard | undefined,
  ): { inside: string; outside: string } {
    const { attributeType, apiType, responseType, bodyType, hasEnumResponse } = method.analyzers.request;
    const responseTypeStr = hasEnumResponse && responseType ? responseType : method.responseTypeInterface;

    if (attributeType === "list" && guard) {
      return this.buildListCall(method, responseTypeStr, guard);
    }
    if (attributeType === "entity") {
      return this.buildEntityCall(method, responseTypeStr, guard);
    }
    if (apiType === "post" || apiType === "put" || apiType === "patch") {
      return this.buildFormCall(method, responseTypeStr, bodyType, strategy);
    }
    if (apiType === "delete") {
      return this.buildDeleteCall(method, responseTypeStr, bodyType, strategy);
    }
    return { inside: "", outside: "" };
  }

  private buildListCall(method: CallMethodInput, responseType: string, guard: StaleGuard): { inside: string; outside: string } {
    const args = this.callArgs([`queryData: { ${this.joinNames(method.analyzers.props.querys)} }`]);
    const inside = `
      const response = await api.get<${responseType}, unknown>(${args})
      const fetched = ${method.analyzers.request.responseType}.from(response.data);
      if (${guard.stale}) return { ok: true, data: fetched };
      this.${guard.field} = fetched;
      this.totalPages = response.totalPages;
    `;
    return { inside, outside: "" };
  }

  private buildEntityCall(
    method: CallMethodInput,
    responseType: string,
    guard: StaleGuard | undefined,
  ): { inside: string; outside: string } {
    const args = this.callArgs([this.buildQuerys(method.analyzers.props.querys)]);
    const entity = `new ${method.analyzers.request.responseType}({ data: response })`;

    const assignment = guard
      ? `if (${guard.stale}) return { ok: true, data: ${entity} };
      this.${guard.field} = ${entity}`
      : "";

    const inside = `
      const response = await api.get<${responseType}, unknown>(${args})

      ${assignment}
    `;
    return { inside, outside: "" };
  }

  private buildFormCall(
    method: CallMethodInput,
    responseType: string,
    bodyType: string | undefined,
    strategy: CallStrategy,
  ): { inside: string; outside: string } {
    const { apiType } = method.analyzers.request;
    const hasHeaders = method.analyzers.props.headers.length > 0;
    const hasData = !!bodyType;

    const outside: string[] = [];
    if (hasData) {
      outside.push(`const data = ${strategy.formStateAccess(method)}.bundle()`);
    }
    if (hasHeaders) {
      outside.push(`const headers = this.headers.bundle()`);
    }

    const args = this.callArgs([hasData ? "data" : "", hasHeaders ? "headers" : ""]);
    const inside = `
      const response = await api.${apiType}<${responseType}>(${args})
    `;

    return { inside, outside: outside.join("\n") };
  }

  private buildDeleteCall(
    method: CallMethodInput,
    responseType: string,
    bodyType: string | undefined,
    strategy: CallStrategy,
  ): { inside: string; outside: string } {
    const hasData = !!bodyType;
    const args = this.callArgs([this.buildQuerys(method.analyzers.props.querys), hasData ? "data" : ""]);
    const outside = hasData ? `const data = ${strategy.formStateAccess(method)}.bundle()` : "";

    const inside = `
      const response = await api.delete<${responseType}, unknown>(${args})
    `;
    return { inside, outside };
  }

  private buildMethodReturn(method: CallMethodInput, strategy: CallStrategy): string {
    const { attributeType, responseType, hasEnumResponse, isPrimitiveResponse } = method.analyzers.request;

    if (attributeType === "list") return `this.${strategy.listStateField(method)}`;
    if (!responseType) return "null";
    // Enum and primitive responses are typed by the raw type name passed as the
    // api call's generic (`api.get<ENUM_X, unknown>` / `api.get<string, unknown>`),
    // so the call resolves to the body itself — never to a `data` wrapper.
    if (hasEnumResponse || isPrimitiveResponse) return "response";
    return `new ${responseType}({ data: response })`;
  }

  /** Type of the `data` that `buildMethodReturn` produces — the `T` of the declared `ApiResult<T>`. */
  private buildDataType(method: CallMethodInput): string {
    const { attributeType, responseType, hasEnumResponse, isPrimitiveResponse } = method.analyzers.request;

    if (attributeType === "list") return `${responseType}['data']`;
    if (!responseType) return "null";
    if (hasEnumResponse) return responseType;
    if (isPrimitiveResponse) return method.responseTypeInterface;
    return responseType;
  }

  private joinNames(props: AttributeProp[]): string {
    return props.map((x) => x.name).join(", ");
  }

  private buildQuerys(querys: AttributeProp[]): string {
    if (querys.length === 0) return "";
    return `queryData: {${querys.map((q) => q.name).join(",")}}`;
  }

  /** Argument object of every `api.*` call: endpoint, the given entries, and the caller's `request` options. */
  private callArgs(entries: string[]): string {
    const lines = ["endpoint", ...entries.filter((e) => e !== ""), "request: params?.request"];
    return `{ ${lines.join(", ")} }`;
  }
}
