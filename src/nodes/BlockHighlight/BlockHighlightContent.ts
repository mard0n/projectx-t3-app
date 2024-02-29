import { addClassNamesToElement } from "@lexical/utils";
import { type NodeKey, type Spread, type LexicalNode, type EditorConfig } from "lexical";
import type { CustomTheme } from "~/utils/lexical/theme";
import { BlockContentNode, type SerializedContentNode } from "../Block";

export type SerializedBlockHighlightContentNode = Spread<
  object,
  SerializedContentNode
>;

const BLOCK_HIGHLIGHT_CONTENT_TYPE = "block-highlight-content" as const;


export class BlockHighlightContentNode extends BlockContentNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return BLOCK_HIGHLIGHT_CONTENT_TYPE;
  }

  static clone(node: BlockHighlightContentNode): BlockHighlightContentNode {
    return new BlockHighlightContentNode(node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const parentDom = super.createDOM(config);
    const parentClassName = parentDom.className;

    const dom = document.createElement("div");
    const theme = config.theme as CustomTheme;
    const classNames = theme.blockHighlight.content;
    if (classNames && parentClassName) {
      addClassNamesToElement(dom, parentClassName);
    }
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(): BlockHighlightContentNode {
    const node = $createBlockHighlightContentNode();
    return node;
  }

  exportJSON(): SerializedBlockHighlightContentNode {
    return {
      ...super.exportJSON(),
      type: BLOCK_HIGHLIGHT_CONTENT_TYPE,
      version: 1,
    };
  }
}

export function $createBlockHighlightContentNode(): BlockHighlightContentNode {
  return new BlockHighlightContentNode();
}

export function $isBlockHighlightContentNode(
  node: LexicalNode | null | undefined,
): node is BlockHighlightContentNode {
  return node instanceof BlockHighlightContentNode;
}
