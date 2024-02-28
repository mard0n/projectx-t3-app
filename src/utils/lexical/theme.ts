import type { EditorThemeClasses } from "lexical";

export const customTheme = {
  block: {
    container: "block-container",
    content: "block-content",
    childContainer: "block-child-container",
  },
  blockText: {
    container: "block-text-container",
    content: "block-text-content",
    h1: "block-h1",
    h2: "block-h2",
    h3: "block-h3",
    p: "block-p",
  },
  text: {
    bold: "textBold",
    italic: "textItalic",
    strikethrough: "textStrikethrough",
    underline: "textUnderline",
  },
  note: "block-note",
} as const;

export type CustomTheme = EditorThemeClasses & typeof customTheme;
