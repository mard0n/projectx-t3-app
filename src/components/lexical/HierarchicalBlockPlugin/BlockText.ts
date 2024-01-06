/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { BlockContainerNode } from ".";
import type {
  LexicalEditor,
  NodeKey,
  Spread,
  SerializedParagraphNode,
  RangeSelection,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  TextNode,
  LineBreakNode,
  EditorConfig,
} from "lexical";
import { ElementNode, $isTextNode } from "lexical";

type SerializedBlockTextNode = Spread<object, SerializedParagraphNode>;

const TEXT_BLOCK_TYPE = "block-text" as const;

/** @noInheritDoc */
export class BlockTextNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return TEXT_BLOCK_TYPE;
  }

  static clone(node: BlockTextNode): BlockTextNode {
    return new BlockTextNode(node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.classList.add(TEXT_BLOCK_TYPE);
    return dom;
  }
  // prevNode: BlockTextNode,
  // dom: HTMLElement,
  // config: EditorConfig
  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: () => ({
        conversion: convertBlockTextElement,
        priority: 0,
      }),
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);

    // if (element && isHTMLElement(element)) {
    //   if (this.isEmpty()) element.append(document.createElement('br'));

    //   const formatType = this.getFormatType();
    //   element.style.textAlign = formatType;

    //   const direction = this.getDirection();
    //   if (direction) {
    //     element.dir = direction;
    //   }
    //   const indent = this.getIndent();
    //   if (indent > 0) {
    //     // padding-inline-start is not widely supported in email HTML, but
    //     // Lexical Reconciler uses padding-inline-start. Using text-indent instead.
    //     element.style.textIndent = `${indent * 20}px`;
    //   }
    // }

    return {
      element,
    };
  }

  static importJSON(serializedNode: SerializedBlockTextNode): BlockTextNode {
    const node = $createBlockTextNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedBlockTextNode {
    const children = this.getLatest()
      .getChildren()
      .map((node) => node.exportJSON());

    return {
      ...super.exportJSON(),
      type: TEXT_BLOCK_TYPE,
      version: 1,
      children,
    };
  }

  // Mutation
  getParent<T extends ElementNode = BlockContainerNode>(): T | null {
    return super.getParent();
  }

  getChildren<T extends LexicalNode = TextNode | LineBreakNode>(): T[] {
    return super.getChildren();
  }

  insertNewAfter(_: RangeSelection, restoreSelection: boolean): BlockTextNode {
    const newElement = $createBlockTextNode();
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

function convertBlockTextElement(): DOMConversionOutput {
  const node = $createBlockTextNode();
  // if (element.style) {
  //   node.setFormat(element.style.textAlign as ElementFormatType);
  //   const indent = parseInt(element.style.textIndent, 10) / 20;
  //   if (indent > 0) {
  //     node.setIndent(indent);
  //   }
  // }
  return { node };
}

export function $createBlockTextNode(
  content?: (TextNode | LineBreakNode | LexicalNode)[],
): BlockTextNode {
  return content?.length
    ? new BlockTextNode().append(...content)
    : new BlockTextNode();
}

export function $isBlockTextNode(
  node: LexicalNode | null | undefined,
): node is BlockTextNode {
  return node instanceof BlockTextNode;
}
