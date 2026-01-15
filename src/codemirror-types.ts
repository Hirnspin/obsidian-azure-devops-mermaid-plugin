/**
 * Type definitions for CodeMirror modules provided by Obsidian
 * These are not installed as npm packages but are available at runtime
 */

export interface CodeMirrorState {
  doc: {
    line(num: number): { from: number; to: number; text: string };
    lineAt(pos: number): { number: number };
  };
}

export interface CodeMirrorNode {
  name: string;
  from: number;
  to: number;
}

export interface CodeMirrorSyntaxTree {
  iterate(config: { enter(node: CodeMirrorNode): void }): void;
}

export interface CodeMirrorDecorationSpec {
  class?: string;
}

export interface CodeMirrorDecoration {
  line(spec: CodeMirrorDecorationSpec): CodeMirrorDecoration;
  mark(spec: CodeMirrorDecorationSpec): CodeMirrorDecoration;
}

export interface CodeMirrorRangeSetBuilder {
  add(from: number, to: number, decoration: CodeMirrorDecoration): void;
  finish(): CodeMirrorDecorationSet;
}

export type CodeMirrorDecorationSet = Record<string, never>;

export interface CodeMirrorEditorView {
  decorations: {
    from(field: unknown): unknown;
  };
}

export interface CodeMirrorTransaction {
  docChanged: boolean;
  state: CodeMirrorState;
}

export interface CodeMirrorStateField {
  define<T>(config: {
    create(state: CodeMirrorState): T;
    update(value: T, transaction: CodeMirrorTransaction): T;
    provide(field: unknown): unknown;
  }): unknown;
}

export interface CodeMirrorAPI {
  EditorView: CodeMirrorEditorView;
  Decoration: CodeMirrorDecoration;
  RangeSetBuilder: new () => CodeMirrorRangeSetBuilder;
  StateField: CodeMirrorStateField;
  syntaxTree(state: CodeMirrorState): CodeMirrorSyntaxTree;
}

interface WindowWithCodeMirror extends Window {
  EditorView: CodeMirrorEditorView;
  Decoration: CodeMirrorDecoration;
  RangeSetBuilder: new () => CodeMirrorRangeSetBuilder;
  StateField: CodeMirrorStateField;
  syntaxTree(state: CodeMirrorState): CodeMirrorSyntaxTree;
}

/**
 * Get CodeMirror API from window (provided by Obsidian)
 */
export function getCodeMirrorAPI(): CodeMirrorAPI {
  const win = window as unknown as WindowWithCodeMirror;
  return {
    EditorView: win.EditorView,
    Decoration: win.Decoration,
    RangeSetBuilder: win.RangeSetBuilder,
    StateField: win.StateField,
    syntaxTree: win.syntaxTree,
  };
}
