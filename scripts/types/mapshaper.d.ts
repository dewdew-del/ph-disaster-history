declare module "mapshaper" {
  /** Runs mapshaper commands on in-memory files; resolves to the output files keyed by name. */
  export function applyCommands(
    commands: string,
    input?: Record<string, unknown>,
  ): Promise<Record<string, string | Uint8Array>>;
  const mapshaper: { applyCommands: typeof applyCommands };
  export default mapshaper;
}
