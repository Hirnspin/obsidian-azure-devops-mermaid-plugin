[![Release Obsidian plugin](https://github.com/Hirnspin/obsidian-azure-devops-mermaid-plugin/actions/workflows/release.yml/badge.svg)](https://github.com/Hirnspin/obsidian-azure-devops-mermaid-plugin/actions/workflows/release.yml)

# Azure DevOps Mermaid Syntax for Obsidian

Obsidian plugin that renders Azure DevOps-style `:::mermaid` blocks by converting them into regular Mermaid code fences for Obsidian's renderer.

## Usage

```
:::mermaid
graph TD
  A --> B
:::
```

The block above renders exactly like a standard ```mermaid fence in preview and reading mode.

## Development

1. Install dependencies: `npm install`
2. Dev build with watch: `npm run dev`
3. Production build: `npm run build`
4. Copy `manifest.json`, `main.js`, and (if present) `styles.css` into your vault's `.obsidian/plugins/azure-devops-mermaid` folder and reload plugins.

## Notes

- Only blocks that start with `:::mermaid` and end with `:::` are transformed.
- Blocks must close with at least the same number of colons used to open them.
