/** Strip YAML frontmatter (`---` … `---`) from the start of markdown. */
export function stripYamlFrontmatter (md: string): string {
  return md.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
}
