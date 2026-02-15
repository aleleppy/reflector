export class MethodEndpointBuilder {
  build(rawEndpoint: string, paths: { name: string }[]): string {
    const processed = this.processEndpoint(rawEndpoint);
    const a = "`";
    return `${a}${processed}${a}`;
  }

  private processEndpoint(rawEndpoint: string): string {
    return rawEndpoint
      .split("/")
      .filter(Boolean)
      .map((str) => {
        const match = /^\{(.+)\}$/.exec(str);
        if (match) {
          const key = match[1];
          return `\${${key}}`;
        }
        return str;
      })
      .join("/");
  }
}
