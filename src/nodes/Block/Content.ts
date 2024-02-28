import { addClassNamesToElement } from "@lexical/utils";
import type {
  NodeKey,
  Spread,
  RangeSelection,
  LexicalNode,
  EditorConfig,
  SerializedElementNode,
  TextNode,
  LineBreakNode,
} from "lexical";
import { ElementNode, $isTextNode } from "lexical";
import { type BlockContainerNode } from ".";
import type { CustomTheme } from "~/utils/lexical/theme";

export type SerializedContentNode = Spread<object, SerializedElementNode>;

const CONTENT_TYPE = "block-content" as const;

export class BlockContentNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return CONTENT_TYPE;
  }

  static clone(node: BlockContentNode): BlockContentNode {
    return new BlockContentNode(node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    const theme = config.theme as CustomTheme;
    const className = theme.block.content;
    if (className !== undefined) {
      addClassNamesToElement(dom, className);
    }
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(serializedNode: SerializedContentNode): BlockContentNode {
    const node = $createBlockContentNode();
    return node;
  }

  exportJSON(): SerializedContentNode {
    return {
      ...super.exportJSON(),
      type: CONTENT_TYPE,
      version: 1,
    };
  }

  // Mutation
  getParent<T extends ElementNode = BlockContainerNode>(): T | null {
    return super.getParent();
  }

  getChildren<T extends LexicalNode = TextNode | LineBreakNode>(): T[] {
    return super.getChildren();
  }

  insertNewAfter(
    _: RangeSelection,
    restoreSelection: boolean,
  ): BlockContentNode {
    const newElement = $createBlockContentNode();
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

export function $createBlockContentNode(): BlockContentNode {
  return new BlockContentNode();
}

export function $isBlockContentNode(
  node: LexicalNode | null | undefined,
): node is BlockContentNode {
  return node instanceof BlockContentNode;
}
