/**
 * Template literal tag that strips the common leading whitespace off each
 * line of the template, so codegen templates can be written with natural
 * source-indentation without that indent leaking into the generated output.
 * Leading/trailing blank lines are dropped; trailing whitespace inside a
 * line is preserved (don't trim — some generated constructs depend on a
 * literal trailing space before a newline).
 *
 * Pre-prettier whitespace differences don't affect the final file because
 * every Source.save runs prettier, which re-indents per scope. This helper
 * exists for author ergonomics, not for output correctness.
 */
export function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
  let raw = "";
  for (let i = 0; i < strings.length; i++) {
    raw += strings[i];
    if (i < values.length) raw += String(values[i]);
  }

  const lines = raw.split("\n");
  if (lines.length && lines[0]!.trim() === "") lines.shift();
  if (lines.length && lines[lines.length - 1]!.trim() === "") lines.pop();

  const indents = lines
    .filter((l) => l.trim().length > 0)
    .map((l) => l.match(/^ */)![0].length);
  const min = indents.length ? Math.min(...indents) : 0;

  return lines.map((l) => l.slice(min)).join("\n");
}

/**
 * Joins sections with `\n`, filtering out empty/null/undefined. For
 * assembling codegen files where some pieces are optional (e.g. enum
 * imports only present when there are enums).
 */
export function joinLines(...sections: (string | undefined | null | false)[]): string {
  return sections.filter((s): s is string => typeof s === "string" && s.length > 0).join("\n");
}
