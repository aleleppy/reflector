import type { Method } from "../Method.js";
import type { AttributeProp } from "../../../types/types.js";

export class MethodPropsBuilder {
  build(method: Method): string {
    const { querys, paths, cookies } = method.analyzers.props;

    const lines: string[] = [];

    if (querys.length > 0) {
      lines.push(`const { ${this.joinNames(querys)} } = this.querys.bundle()`);
    }
    if (paths.length > 0) {
      lines.push(`const { ${this.joinNames(paths)} } = this.paths`);
    }
    if (cookies.length > 0) {
      lines.push(`const cookies = this.cookies`);
    }

    return lines.join("\n");
  }

  private joinNames(props: AttributeProp[]): string {
    return props.map((x) => x.name).join(", ");
  }
}
