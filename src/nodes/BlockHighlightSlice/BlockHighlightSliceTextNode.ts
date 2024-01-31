/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { addClassNamesToElement } from "@lexical/utils";
import type {
  NodeKey,
  Spread,
  SerializedParagraphNode,
  RangeSelection,
  LexicalNode,
  TextNode,
  LineBreakNode,
  EditorConfig,
} from "lexical";
import { ElementNode, $isTextNode } from "lexical";
import { type BlockHighlightSliceNode } from ".";

export type SerializedBlockHighlightSliceTextNode = Spread<
  object,
  SerializedParagraphNode
>;

export const BLOCK_HIGHLIGHT_SLICE_TEXT_TYPE =
  "block-highlight-slice-text" as const;

export class BlockHighlightSliceTextNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return BLOCK_HIGHLIGHT_SLICE_TEXT_TYPE;
  }

  static clone(node: BlockHighlightSliceTextNode): BlockHighlightSliceTextNode {
    return new BlockHighlightSliceTextNode(node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("li");
    
    // const theme = config.theme;
    // const className = (theme.block as { text: string }).text;
    // if (className !== undefined) {
    //   addClassNamesToElement(dom, className);
    // }
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(
    serializedNode: SerializedBlockHighlightSliceTextNode,
  ): BlockHighlightSliceTextNode {
    const node = $createBlockHighlightSliceTextNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedBlockHighlightSliceTextNode {
    const children = this.getLatest()
      .getChildren()
      .map((node) => node.exportJSON());

    return {
      ...super.exportJSON(),
      type: BLOCK_HIGHLIGHT_SLICE_TEXT_TYPE,
      version: 1,
      children,
    };
  }

  // Mutation
  getParent<T extends ElementNode = BlockHighlightSliceNode>(): T | null {
    return super.getParent();
  }

  getChildren<T extends LexicalNode = TextNode | LineBreakNode>(): T[] {
    return super.getChildren();
  }

  insertNewAfter(
    _: RangeSelection,
    restoreSelection: boolean,
  ): BlockHighlightSliceTextNode {
    const newElement = $createBlockHighlightSliceTextNode();
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

export function $createBlockHighlightSliceTextNode(
  content?: (TextNode | LineBreakNode | LexicalNode)[],
): BlockHighlightSliceTextNode {
  return content?.length
    ? new BlockHighlightSliceTextNode().append(...content)
    : new BlockHighlightSliceTextNode();
}

export function $isBlockHighlightSliceTextNode(
  node: LexicalNode | null | undefined,
): node is BlockHighlightSliceTextNode {
  return node instanceof BlockHighlightSliceTextNode;
}
