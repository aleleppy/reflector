export function getFilteredEntities(rawEndpoint: string): string[] {
  const splittedEntitys = rawEndpoint.split("/");
  return splittedEntitys.filter((item) => item !== "" && !item.includes("{"));
}

export function getEndpoint(rawEndpoint: string): string {
  const filteredEntitys = getFilteredEntities(rawEndpoint);
  return filteredEntitys.join("/");
}

export function getFullEndpoint(rawEndpoint: string): string {
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

export function extractPathParams(rawEndpoint: string): string[] {
  const params: string[] = [];
  rawEndpoint.split("/").forEach((segment) => {
    const match = /^\{(.+)\}$|^\[(.+)\]$/.exec(segment);
    if (match) {
      const param = match[1] || match[2];
      if (param) params.push(param);
    }
  });
  return params;
}
