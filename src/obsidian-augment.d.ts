import type MarkdownIt from "markdown-it";
import "obsidian";

declare module "obsidian" {
  interface MarkdownPostProcessorContext {
    docId?: string;
  }

  interface Plugin {
    registerMarkdownIt?: (fn: (md: MarkdownIt) => MarkdownIt) => void;
    registerMarkdownPostProcessor?: (
      processor: (el: HTMLElement, ctx: MarkdownPostProcessorContext) => void | Promise<void>,
      priority?: number
    ) => void;
    registerMarkdownCodeBlockProcessor?: (
      language: string,
      processor: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void | Promise<void>,
      priority?: number
    ) => void;
  }
}
