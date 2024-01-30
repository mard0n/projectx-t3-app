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
  RangeSelection,
  LexicalNode,
  TextNode,
  LineBreakNode,
  EditorConfig,
} from "lexical";
import { type ElementNode, $isTextNode } from "lexical";
import type { BlockHighlightParagraphNode } from "./BlockHighlightParagraphNode";
import { BlockTextNode, type SerializedBlockTextNode } from "../Block";

export type SerializedBlockHighlightParagraphCommentNode = Spread<
  object,
  SerializedBlockTextNode
>;

export const BLOCK_HIGHLIGHT_PARAGRAPH_COMMENT =
  "block-highlight-paragraph-comment" as const;

export class BlockHighlightParagraphCommentNode extends BlockTextNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return BLOCK_HIGHLIGHT_PARAGRAPH_COMMENT;
  }

  static clone(
    node: BlockHighlightParagraphCommentNode,
  ): BlockHighlightParagraphCommentNode {
    return new BlockHighlightParagraphCommentNode(node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
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

  static importJSON(): BlockHighlightParagraphCommentNode {
    const node = $createBlockHighlightParagraphCommentNode();
    return node;
  }

  exportJSON(): SerializedBlockHighlightParagraphCommentNode {
    return {
      ...super.exportJSON(),
      type: BLOCK_HIGHLIGHT_PARAGRAPH_COMMENT,
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
  ): BlockHighlightParagraphCommentNode {
    const newElement = $createBlockHighlightParagraphCommentNode();
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

export function $createBlockHighlightParagraphCommentNode(
  content?: (TextNode | LineBreakNode | LexicalNode)[],
): BlockHighlightParagraphCommentNode {
  return content?.length
    ? new BlockHighlightParagraphCommentNode().append(...content)
    : new BlockHighlightParagraphCommentNode();
}

export function $isBlockHighlightParagraphCommentNode(
  node: LexicalNode | null | undefined,
): node is BlockHighlightParagraphCommentNode {
  return node instanceof BlockHighlightParagraphCommentNode;
}
