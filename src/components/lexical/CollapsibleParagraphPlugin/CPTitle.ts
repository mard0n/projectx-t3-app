/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { CPContainerNode } from ".";
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
} from "lexical";
import { ElementNode, $isTextNode } from "lexical";

type SerializedCPTitleNode = Spread<object, SerializedParagraphNode>;

/** @noInheritDoc */
export class CPTitleNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return "title";
  }

  static clone(node: CPTitleNode): CPTitleNode {
    return new CPTitleNode(node.__key);
  }

  // View
  createDOM(): HTMLElement {
    const dom = document.createElement("p");
    dom.classList.add("collapsible-paragraph-title");
    return dom;
  }
  // prevNode: CPTitleNode,
  // dom: HTMLElement,
  // config: EditorConfig
  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: () => ({
        conversion: convertCPTitleElement,
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

  static importJSON(serializedNode: SerializedCPTitleNode): CPTitleNode {
    const node = $createCPTitleNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedCPTitleNode {
    const children = this.getLatest()
      .getChildren()
      .map((node) => node.exportJSON());

    return {
      ...super.exportJSON(),
      type: "title",
      version: 1,
      children,
    };
  }

  // Mutation

  getParentCPContainer() {
    return this.getLatest().getParent<CPContainerNode>();
  }

  insertNewAfter(_: RangeSelection, restoreSelection: boolean): CPTitleNode {
    const newElement = $createCPTitleNode();
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

function convertCPTitleElement(): DOMConversionOutput {
  const node = $createCPTitleNode();
  // if (element.style) {
  //   node.setFormat(element.style.textAlign as ElementFormatType);
  //   const indent = parseInt(element.style.textIndent, 10) / 20;
  //   if (indent > 0) {
  //     node.setIndent(indent);
  //   }
  // }
  return { node };
}

export function $createCPTitleNode(
  content?: (TextNode | LineBreakNode | LexicalNode)[],
): CPTitleNode {
  return content?.length
    ? new CPTitleNode().append(...content)
    : new CPTitleNode();
}

export function $isCPTitleNode(
  node: LexicalNode | null | undefined,
): node is CPTitleNode {
  return node instanceof CPTitleNode;
}
