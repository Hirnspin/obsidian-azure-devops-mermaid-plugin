import { Plugin, MarkdownRenderer } from "obsidian";
import type MarkdownIt from "markdown-it";
import type { MarkdownPostProcessorContext } from "obsidian";
import { getCodeMirrorAPI } from "./codemirror-types";
import type { CodeMirrorState, CodeMirrorNode, CodeMirrorAPI, CodeMirrorDecorationSet } from "./codemirror-types";

declare global {
  interface Window {
    mermaid?: {
      contentLoaded: () => void;
      render?: (id: string, text: string) => Promise<{ svg: string }> | string;
    };
  }
}

const OPEN_MARKER = ":";
const MIN_MARKER_COUNT = 3;
const TARGET_INFO = "mermaid";

export default class AzureDevOpsMermaidPlugin extends Plugin {
  onload(): void {
    console.debug("[AzureDevOpsMermaid] Plugin loading...");

    // Method 1: Try registerMarkdownIt (Obsidian >= 1.4.16)
    if (this.registerMarkdownIt) {
      console.debug("[AzureDevOpsMermaid] Using registerMarkdownIt");
      this.registerMarkdownIt((md: MarkdownIt) => {
        md.block.ruler.before(
          "fence",
          "azure-devops-mermaid",
          createAzureMermaidRule(),
          { alt: ["paragraph", "reference", "blockquote", "list"] }
        );
        return md;
      });
      console.debug("[AzureDevOpsMermaid] ✓ Markdown-it rule registered");
    }
    // Method 2: Fallback to DOM post-processor
    else if (this.registerMarkdownPostProcessor) {
      console.debug("[AzureDevOpsMermaid] Using registerMarkdownPostProcessor fallback");
      this.registerMarkdownPostProcessor((el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        transformAzureMermaidGlobally(el, this);
      }, 5);
      console.debug("[AzureDevOpsMermaid] ✓ DOM post-processor registered");
    } else {
      console.error("[AzureDevOpsMermaid] No markdown processing method available!");
    }

    // Register CodeMirror editor extensions for syntax highlighting and folding
    this.registerEditorExtension(createAzureMermaidEditorExtension() as never);
    this.registerEditorExtension(createMermaidFoldExtension() as never);
    console.debug("[AzureDevOpsMermaid] ✓ Editor extensions registered");

    // Load CSS for syntax highlighting
    interface PluginWithAddCSSFile extends Plugin {
      addCSSFile(path: string): void;
    }
    (this as unknown as PluginWithAddCSSFile).addCSSFile("styles.css");
  }
}

interface MarkdownItState {
  bMarks: number[];
  tShift: number[];
  eMarks: number[];
  src: string;
  line: number;
  getLines(start: number, end: number, indent: number, keepLastLF: boolean): string;
  push(type: string, tag: string, nesting: number): MarkdownItToken;
}

interface MarkdownItToken {
  info: string;
  content: string;
  markup: string;
  map: [number, number] | null;
}

function createAzureMermaidRule() {
  return (state: MarkdownItState, startLine: number, endLine: number, silent: boolean): boolean => {
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const endPos = state.eMarks[startLine];
    const line = state.src.slice(startPos, endPos).trim();

    const markerMatch = line.match(/^:{3,}\s*(\w*)\s*$/);
    if (!markerMatch) return false;

    const markerCount = markerMatch[0].match(/^:+/)?.[0].length ?? 0;
    if (markerCount < MIN_MARKER_COUNT) return false;

    const info = markerMatch[1]?.toLowerCase();
    if (info !== TARGET_INFO) return false;

    if (silent) return true;

    let nextLine = startLine + 1;
    let foundClosing = false;

    while (nextLine < endLine) {
      const nextStart = state.bMarks[nextLine] + state.tShift[nextLine];
      const nextEnd = state.eMarks[nextLine];
      const nextLineText = state.src.slice(nextStart, nextEnd).trim();

      const closingMatch = nextLineText.match(/^:{3,}\s*$/);
      if (closingMatch) {
        const closingCount = closingMatch[0].length;
        if (closingCount >= markerCount) {
          foundClosing = true;
          break;
        }
      }

      nextLine += 1;
    }

    if (!foundClosing) return false;

    const content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], false);

    const token = state.push("fence", "code", 0);
    token.info = TARGET_INFO;
    token.content = content;
    token.markup = OPEN_MARKER.repeat(markerCount);
    token.map = [startLine, nextLine + 1];

    state.line = nextLine + 1;
    return true;
  };
}

/**
 * CodeMirror extension for Azure DevOps Mermaid syntax highlighting
 */
function createAzureMermaidEditorExtension(): unknown {
  const cm = getCodeMirrorAPI();

  const mermaidHighlight = cm.StateField.define({
    create(state: CodeMirrorState) {
      return buildMermaidDecorations(state, cm);
    },
    update(decorations: CodeMirrorDecorationSet, transaction: { docChanged: boolean; state: CodeMirrorState }) {
      if (transaction.docChanged) {
        return buildMermaidDecorations(transaction.state, cm);
      }
      return decorations;
    },
    provide(field: unknown) {
      return cm.EditorView.decorations.from(field);
    },
  });

  return mermaidHighlight;
}

/**
 * Build decorations for :::mermaid blocks in the editor
 */
function buildMermaidDecorations(state: CodeMirrorState, cm: CodeMirrorAPI): CodeMirrorDecorationSet {
  const builder = new cm.RangeSetBuilder();

  // Find all fence blocks and look for mermaid ones
  cm.syntaxTree(state).iterate({
    enter(node: CodeMirrorNode) {
      if (node.name === "FencedCode") {
        const startLine = state.doc.lineAt(node.from).number;
        const endLine = state.doc.lineAt(node.to).number;
        const firstLine = state.doc.line(startLine).text;

        // Check if this is a :::mermaid block
        if (firstLine.match(/^:{3,}\s*mermaid\s*$/i)) {
          // Highlight the entire block with a background
          const blockDecor = cm.Decoration.line({
            class: "azure-mermaid-block",
          });

          for (let line = startLine; line <= endLine; line++) {
            const lineStart = state.doc.line(line).from;
            builder.add(lineStart, lineStart, blockDecor);
          }

          // Highlight opening marker
          const markerDecor = cm.Decoration.mark({
            class: "azure-mermaid-marker",
          });
          const openingStart = node.from;
          const openingEnd = state.doc.line(startLine).to;
          builder.add(openingStart, openingEnd, markerDecor);

          // Highlight closing marker (last line)
          const lastLineStart = state.doc.line(endLine).from;
          const lastLineEnd = state.doc.line(endLine).to;
          builder.add(lastLineStart, lastLineEnd, markerDecor);
        }
      }
    },
  });

  return builder.finish();
}

/**
 * Code folding support for :::mermaid blocks
 */
function createMermaidFoldExtension(): unknown[] {
  // Return an empty extension - Obsidian handles folding natively
  // This is a placeholder for future fold customization
  return [];
}

/**
 * Global transform: walk through all el-* block elements looking for :::mermaid patterns.
 * Since Obsidian post-processor is called element-by-element, we need to process
 * the whole DOM tree looking for the pattern.
 */
function transformAzureMermaidGlobally(rootEl: HTMLElement, plugin: AzureDevOpsMermaidPlugin): void {
  // Skip if already processed (marked with data attribute)
  if (rootEl.hasAttribute("data-azure-mermaid-processed")) {
    return;
  }
  // Walk up from rootEl to find a common ancestor that contains all sibling blocks
  let root = rootEl;
  while (root.parentElement && root.parentElement.querySelectorAll("[class*='el-']").length > 1) {
    root = root.parentElement;
  }

  // If we hit the document root, try one level down
  if (root === document.body) {
    root = rootEl.parentElement || rootEl;
  }

  // Get all el-* blocks from the root level
  let allBlocks: HTMLElement[] = [];

  // Check if root itself is an el-* block
  if (root.className?.includes("el-")) {
    allBlocks.push(root);
  }

  // Add all el-* descendants
  allBlocks = allBlocks.concat(Array.from(root.querySelectorAll("[class*='el-']")));

  for (let i = 0; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    if (!block.isConnected) continue;

    const text = block.textContent?.trim() ?? "";
    const lines = text.split('\n').map(l => l.trim());

    // Look for opening :::mermaid (check first line)
    if (!lines[0]?.match(/^:{3,}\s*mermaid\s*$/i)) continue;

    // Collect following blocks until closing :::
    const contentLines: string[] = [];
    let closingIdx = -1;

    for (let j = i + 1; j < allBlocks.length; j++) {
      const nextBlock = allBlocks[j];
      if (!nextBlock.isConnected) continue;

      const nextText = nextBlock.textContent?.trim() ?? "";
      const nextLines = nextText.split('\n').map(l => l.trim());

      // Check if closing marker is in this block's lines
      let foundClosing = false;
      for (let k = 0; k < nextLines.length; k++) {
        if (/^:{3,}\s*$/.test(nextLines[k])) {
          // Found closing marker at line k
          // Add lines before it
          contentLines.push(...nextLines.slice(0, k));
          closingIdx = j;
          foundClosing = true;
          break;
        }
      }

      if (foundClosing) break;

      // No closing marker in this block, add all lines
      contentLines.push(...nextLines);
    }

    if (closingIdx === -1) {
      console.debug("[AzureDevOpsMermaid] No closing ::: found");
      continue;
    }

    const content = contentLines.join("\n").trim();

    // Create a standard mermaid code block markdown
    const mermaidMarkdown = `\`\`\`mermaid\n${content}\n\`\`\``;
    
    // Clear the opening block
    block.innerHTML = "";
    
    // Mark all blocks as processed
    block.setAttribute("data-azure-mermaid-processed", "true");
    for (let j = i + 1; j <= closingIdx; j++) {
      const b = allBlocks[j];
      if (b?.isConnected) {
        b.setAttribute("data-azure-mermaid-processed", "true");
      }
    }
    
    // Render mermaid synchronously
    try {
      void MarkdownRenderer.render(
        plugin.app,
        mermaidMarkdown,
        block,
        "",
        // eslint-disable-next-line obsidianmd/no-plugin-as-component -- MarkdownRenderer requires Component
        plugin
      );
    } catch (e) {
      console.debug(`[AzureDevOpsMermaid] MarkdownRenderer error: ${String(e)}`);
    }
    
    // Hide/clear intermediate blocks
    for (let j = i + 1; j <= closingIdx; j++) {
      const toHide = allBlocks[j];
      if (toHide?.isConnected) {
        toHide.innerHTML = "";
        toHide.classList.add("azure-mermaid-hidden");
      }
    }
    
    // Skip ahead past the processed blocks
    i = closingIdx;
  }
}





