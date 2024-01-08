/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { addClassNamesToElement } from "@lexical/utils";
import type { BlockContainerNode } from ".";
import type {
  SerializedElementNode,
  NodeKey,
  LexicalNode,
  TextNode,
  Spread,
  EditorConfig,
} from "lexical";
import { ElementNode } from "lexical";

type SerializedBlockChildContainerNode = Spread<object, SerializedElementNode>;

const CHILD_CONTAINER_BLOCK_TYPE = "block-child-container" as const;

export class BlockChildContainerNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return CHILD_CONTAINER_BLOCK_TYPE;
  }

  static clone(node: BlockChildContainerNode): BlockChildContainerNode {
    return new BlockChildContainerNode(node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    const theme = config.theme;
    const className = (theme.block as { childContainer: string })
      .childContainer;
    if (className !== undefined) {
      addClassNamesToElement(dom, className);
    }

    const children = this.getChildren();
    if (!children.length) {
      dom.style.display = "none";
    }

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

  static importJSON(
    serializedNode: SerializedBlockChildContainerNode,
  ): BlockChildContainerNode {
    const node = $createBlockChildContainerNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedBlockChildContainerNode {
    const children = this.getLatest()
      .getChildren()
      .map((node) => node.exportJSON());

    return {
      ...super.exportJSON(),
      type: CHILD_CONTAINER_BLOCK_TYPE,
      version: 1,
      children,
    };
  }

  // Mutation
  getParent<T extends ElementNode = BlockContainerNode>(): T | null {
    return super.getParent();
  }

  getChildren<T extends LexicalNode = BlockContainerNode>(): T[] {
    return super.getChildren();
  }
}

export function $createBlockChildContainerNode(
  children?: BlockContainerNode[],
): BlockChildContainerNode {
  if (children?.length) {
    return new BlockChildContainerNode().append(...children);
  } else {
    return new BlockChildContainerNode().append();
  }
}

export function $isBlockChildContainerNode(
  node: LexicalNode | null | undefined,
): node is BlockChildContainerNode {
  return node instanceof BlockChildContainerNode;
}
