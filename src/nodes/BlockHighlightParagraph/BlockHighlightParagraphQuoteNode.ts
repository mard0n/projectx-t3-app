import { addClassNamesToElement } from "@lexical/utils";
import type {
  NodeKey,
  Spread,
  RangeSelection,
  LexicalNode,
  TextNode,
  LineBreakNode,
  EditorConfig,
} from "lexical";
import { type ElementNode, $isTextNode } from "lexical";
import type { BlockHighlightParagraphNode } from "./BlockHighlightParagraphNode";
import { BlockTextNode, type SerializedBlockTextNode } from "../Block";

export type SerializedBlockHighlightParagraphQuoteNode = Spread<
  object,
  SerializedBlockTextNode
>;

export const BLOCK_HIGHLIGHT_PARAGRAPH_QUOTE = "block-highlight-paragraph-quote" as const;

export class BlockHighlightParagraphQuoteNode extends BlockTextNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return BLOCK_HIGHLIGHT_PARAGRAPH_QUOTE;
  }

  static clone(
    node: BlockHighlightParagraphQuoteNode,
  ): BlockHighlightParagraphQuoteNode {
    return new BlockHighlightParagraphQuoteNode(node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.contentEditable = "false";
    const theme = config.theme;
    const className = (theme.block as { text: string }).text;
    if (className !== undefined) {
      addClassNamesToElement(dom, className);
    }
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(): BlockHighlightParagraphQuoteNode {
    const node = $createBlockHighlightParagraphQuoteNode();
    return node;
  }

  exportJSON(): SerializedBlockHighlightParagraphQuoteNode {
    return {
      ...super.exportJSON(),
      type: BLOCK_HIGHLIGHT_PARAGRAPH_QUOTE,
      version: 1,
    };
  }

  // Mutation
  getParent<T extends ElementNode = BlockHighlightParagraphNode>(): T | null {
    return super.getParent();
  }

  getChildren<T extends LexicalNode = TextNode | LineBreakNode>(): T[] {
    return super.getChildren();
  }

  insertNewAfter(
    _: RangeSelection,
    restoreSelection: boolean,
  ): BlockHighlightParagraphQuoteNode {
    const newElement = $createBlockHighlightParagraphQuoteNode();
    const direction = this.getDirection();
    newElement.setDirection(direction);
    this.insertAfter(newElement, restoreSelection);
    return newElement;
  }

  collapseAtStart(): boolean {
    const children = this.getChildren();
    // If we have an empty (trimmed) first paragraph and try and remove it,
    // delete the paragraph as long as we have another sibling to go to
    if (
      children.length === 0 ||
      ($isTextNode(children[0]) && children[0].getTextContent().trim() === "")
    ) {
      const nextSibling = this.getNextSibling();
      if (nextSibling !== null) {
        this.selectNext();
        this.remove();
        return true;
      }
      const prevSibling = this.getPreviousSibling();
      if (prevSibling !== null) {
        this.selectPrevious();
        this.remove();
        return true;
      }
    }
    return false;
  }
}

export function $createBlockHighlightParagraphQuoteNode(
  content?: (TextNode | LineBreakNode | LexicalNode)[],
): BlockHighlightParagraphQuoteNode {
  return content?.length
    ? new BlockHighlightParagraphQuoteNode().append(...content)
    : new BlockHighlightParagraphQuoteNode();
}

export function $isBlockHighlightParagraphQuoteNode(
  node: LexicalNode | null | undefined,
): node is BlockHighlightParagraphQuoteNode {
  return node instanceof BlockHighlightParagraphQuoteNode;
}
