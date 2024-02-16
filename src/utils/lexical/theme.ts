import type { EditorThemeClasses } from "lexical";

export const customTheme = {
  blockParagraph: "block-paragraph",
  text: {
    bold: "textBold",
    italic: "textItalic",
    strikethrough: "textStrikethrough",
    underline: "textUnderline",
  },
  block: {
    container: "block-container",
    content: "block-content",
    childContainer: "block-child-container",
  },
  note: 'block-note',
  header: {
    h1: "block-h1",
    h2: "block-h2",
    h3: "block-h3",
    h4: "block-h4",
  },
} as const;

export type CustomTheme = EditorThemeClasses & typeof customTheme;
