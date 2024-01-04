/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { CPContainerNode } from ".";
import type {
  SerializedElementNode,
  LexicalEditor,
  NodeKey,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  TextNode,
  Spread,
} from "lexical";
import { ElementNode } from "lexical";

type SerializedCPChildContainerNode = Spread<object, SerializedElementNode>;

/** @noInheritDoc */
export class CPChildContainerNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return "child-container";
  }

  static clone(node: CPChildContainerNode): CPChildContainerNode {
    return new CPChildContainerNode(node.__key);
  }

  // View

  createDOM(): HTMLElement {
    const dom = document.createElement("div");
    dom.classList.add("collapsible-paragraph-child-container");
    const children = this.getChildren();
    if (!children.length) {
      dom.style.display = "none";
    }
    // dom.id = this.getKey();
    return dom;
  }
  updateDOM(prevNode: TextNode, dom: HTMLElement): boolean {
    const children = this.getChildren();
    if (!children.length) {
      dom.style.display = "none";
    } else {
      dom.style.removeProperty("display");
    }
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: () => ({
        conversion: convertCPChildContainerElement,
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

  static importJSON(
    serializedNode: SerializedCPChildContainerNode,
  ): CPChildContainerNode {
    const node = $createCPChildContainerNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedCPChildContainerNode {
    const children = this.getLatest()
      .getChildren()
      .map((node) => node.exportJSON());

    return {
      ...super.exportJSON(),
      type: "child-container",
      version: 1,
      children,
    };
  }

  // Mutation
  getParent<T extends ElementNode = CPContainerNode>(): T | null {
    return super.getParent();
  }

  getChildren<T extends LexicalNode = CPContainerNode>(): T[] {
    return super.getChildren();
  }
}

function convertCPChildContainerElement(): DOMConversionOutput {
  const node = $createCPChildContainerNode();
  // if (element.style) {
  //   node.setFormat(element.style.textAlign as ElementFormatType);
  //   const indent = parseInt(element.style.textIndent, 10) / 20;
  //   if (indent > 0) {
  //     node.setIndent(indent);
  //   }
  // }
  return { node };
}

export function $createCPChildContainerNode(
  children?: CPContainerNode[],
): CPChildContainerNode {
  if (children?.length) {
    return new CPChildContainerNode().append(...children);
  } else {
    return new CPChildContainerNode().append();
  }
}

export function $isCPChildContainerNode(
  node: LexicalNode | null | undefined,
): node is CPChildContainerNode {
  return node instanceof CPChildContainerNode;
}
