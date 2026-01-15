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

export interface CodeMirrorDecorationSet {
  // Placeholder for DecorationSet interface
}

export interface CodeMirrorEditorView {
  decorations: {
    from(field: any): any;
  };
}

export interface CodeMirrorStateField {
  define<T>(config: {
    create(state: CodeMirrorState): T;
    update(value: T, transaction: any): T;
    provide(field: any): any;
  }): any;
}

export interface CodeMirrorAPI {
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
  return {
    EditorView: (window as any).EditorView,
    Decoration: (window as any).Decoration,
    RangeSetBuilder: (window as any).RangeSetBuilder,
    StateField: (window as any).StateField,
    syntaxTree: (window as any).syntaxTree,
  };
}
