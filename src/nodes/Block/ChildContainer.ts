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
import type { CustomTheme } from "~/utils/lexical/theme";

type SerializedBlockChildContainerNode = Spread<object, SerializedElementNode>;

const CHILD_CONTAINER_TYPE = "block-child-container" as const;

export class BlockChildContainerNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return CHILD_CONTAINER_TYPE;
  }

  static clone(node: BlockChildContainerNode): BlockChildContainerNode {
    return new BlockChildContainerNode(node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    const theme = config.theme as CustomTheme;
    const className = theme.block.childContainer;
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
    return node;
  }

  exportJSON(): SerializedBlockChildContainerNode {
    return {
      ...super.exportJSON(),
      type: CHILD_CONTAINER_TYPE,
      version: 1,
    };
  }

  // Mutation
  append(...nodesToAppend: BlockContainerNode[]): this {
    return super.append(...nodesToAppend);
  }

  getParent<T extends ElementNode = BlockContainerNode>(): T | null {
    return super.getParent();
  }

  getChildren<T extends LexicalNode = BlockContainerNode>(): T[] {
    return super.getChildren();
  }
}

export function $createBlockChildContainerNode(): BlockChildContainerNode {
  return new BlockChildContainerNode();
}

export function $isBlockChildContainerNode(
  node: LexicalNode | null | undefined,
): node is BlockChildContainerNode {
  return node instanceof BlockChildContainerNode;
}
