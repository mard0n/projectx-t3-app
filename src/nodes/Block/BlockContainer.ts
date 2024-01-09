/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { $findMatchingParent, addClassNamesToElement } from "@lexical/utils";
import {
  $createBlockChildContainerNode,
  $createBlockTextNode,
  $isBlockChildContainerNode,
  $isBlockTextNode,
} from ".";
import type { BlockChildContainerNode, BlockTextNode } from ".";
import type {
  SerializedElementNode,
  EditorConfig,
  LexicalEditor,
  NodeKey,
  Spread,
  LexicalNode,
  LineBreakNode,
  TextNode,
  SerializedTextNode,
  SerializedLineBreakNode,
  RootNode,
} from "lexical";
import { $parseSerializedNode, ElementNode } from "lexical";
import { z } from "zod";
import {
  SerializedElementNodeSchema,
  hasToggleElemClicked,
} from "~/utils/lexical";
import type { Prettify } from "~/utils/types";

export const SerializedBlockContainerNodeSchema: z.ZodType<SerializedBlockContainerNode> =
  z
    .object({
      id: z.string(),
      open: z.boolean(),
      title: z.string(),
      childNotes: z.lazy(() => z.array(SerializedBlockContainerNodeSchema)),
      parentId: z.string().nullable(),
      indexWithinParent: z.number(),
    })
    .merge(SerializedElementNodeSchema);

export type SerializedBlockContainerNode = Prettify<
  Spread<
    {
      id: string;
      open: boolean;
      title: string;
      childNotes: SerializedBlockContainerNode[]; // HACK: Using it when deserializing (To Not to use children) when passing down from DB
      parentId: string | null;
      indexWithinParent: number;
    },
    SerializedElementNode
  >
>;

export const CONTAINER_BLOCK_TYPE = "block-container" as const;

export class BlockContainerNode extends ElementNode {
  __open: boolean;
  __id: string;
  __selected: boolean;

  constructor({
    open,
    key,
    id,
    selected,
  }: Partial<{
    open?: boolean;
    selected?: boolean;
    key?: NodeKey;
    id?: string;
  }> = {}) {
    super(key);
    this.__open = open ?? true;
    this.__id = id ?? crypto.randomUUID();
    this.__selected = selected ?? false;
  }

  static clone(node: BlockContainerNode): BlockContainerNode {
    return new BlockContainerNode({
      open: node.__open,
      key: node.__key,
      id: node.__id,
      selected: node.__selected,
    });
  }

  static getType(): string {
    return CONTAINER_BLOCK_TYPE;
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = document.createElement("div");
    const theme = config.theme;
    const className = (theme.block as { container: string }).container;
    if (className !== undefined) {
      addClassNamesToElement(dom, className);
    }

    if (this.__open) {
      dom.classList.add("open");
    } else {
      dom.classList.add("closed");
    }

    if (this.__selected) {
      dom.classList.add("selected");
    } else {
      dom.classList.remove("selected");
    }

    dom.addEventListener("click", (event) => {
      console.log("createDOM click event");
      if (hasToggleElemClicked(event)) {
        editor.update(() => {
          this.toggleOpen();
        });
      }
    });
    return dom;
  }

  updateDOM(prevNode: BlockContainerNode, dom: HTMLDivElement): boolean {
    if (prevNode.__open !== this.__open) {
      dom.classList.remove(...["open", "closed"]);
      if (this.__open) {
        dom.classList.add("open");
      } else {
        dom.classList.add("closed");
      }
    }

    if (prevNode.__selected !== this.__selected) {
      if (this.__selected) {
        dom.classList.add("selected");
      } else {
        dom.classList.remove("selected");
      }
    }
    return false;
  }

  static importJSON(
    serializedNode: SerializedBlockContainerNode,
  ): BlockContainerNode {
    let node;
    // To avoid issues with parseSerializedNode. In some cases (when PASTING for example), children exist
    if (serializedNode.children?.length) {
      node = $createBlockContainerNode({ prepopulateChildren: false });
    } else {
      let textArray: (SerializedTextNode | SerializedLineBreakNode)[] = [];

      if (serializedNode.title) {
        try {
          // TODO: Need to validate the shape. if data is proper
          textArray = JSON.parse(serializedNode.title) as (
            | SerializedTextNode
            | SerializedLineBreakNode
          )[];
        } catch (error) {}
      }

      const textNode = textArray.map((node) => {
        return $parseSerializedNode(node);
      }) as TextNode[];

      const children =
        (serializedNode.childNotes?.map((node) => {
          return $parseSerializedNode(node);
        }) as BlockContainerNode[]) || [];
      node = $createBlockContainerNode({
        titleNode: textNode,
        childContainerNodes: children,
      });
    }

    node.setId(serializedNode.id || crypto.randomUUID());
    node.setOpen(serializedNode.open);
    node.setDirection(serializedNode.direction);
    node.setIndent(serializedNode?.indent ?? 0);
    node.setFormat(serializedNode?.format ?? "");
    return node;
  }

  exportJSON(): SerializedBlockContainerNode {
    const titleNode = this.getBlockTextNode();
    const titleNodeContent =
      titleNode?.getChildren().map((node) => node.exportJSON()) ?? [];

    const childContainerNode = this.getBlockChildContainerNode();
    const childContainerNodeContent =
      childContainerNode
        ?.getChildren<BlockContainerNode>()
        .map((node) => node.exportJSON()) ?? [];

    const parentBlockContainerNodeId = this.getParentCPContainer()?.getId();

    const children = this.getChildren().map((node) => node.exportJSON());

    return {
      ...super.exportJSON(),
      title: JSON.stringify(titleNodeContent),
      childNotes: childContainerNodeContent, // Used only for debugging purposes
      parentId: parentBlockContainerNodeId ?? null,
      indexWithinParent: this.getIndexWithinParent(),
      open: this.getOpen(),
      type: CONTAINER_BLOCK_TYPE,
      id: this.getId(),
      version: 1,
      children,
    };
  }

  // Mutation
  getBlockTextNode() {
    return this.getLatest()
      .getChildren()
      .find((node): node is BlockTextNode => $isBlockTextNode(node));
  }

  getBlockChildContainerNode() {
    return this.getLatest()
      .getChildren()
      .find((node): node is BlockChildContainerNode =>
        $isBlockChildContainerNode(node),
      );
  }

  getParent<
    T extends ElementNode = BlockChildContainerNode | RootNode,
  >(): T | null {
    return super.getParent();
  }

  getParentCPContainer(): BlockContainerNode | undefined {
    const parent = this.getLatest().getParent<
      BlockChildContainerNode | RootNode
    >();
    if ($isBlockChildContainerNode(parent)) {
      const parentContainer = parent.getParent<BlockContainerNode>();
      if (parentContainer) {
        return parentContainer;
      }
    }
  }

  getId(): string {
    return this.getLatest().__id;
  }

  setId(id: string) {
    this.getWritable().__id = id;
  }

  getOpen(): boolean {
    return this.getLatest().__open;
  }

  setOpen(open: boolean) {
    this.getWritable().__open = open;
  }

  toggleOpen(): void {
    this.setOpen(!this.getOpen());
  }

  getSelected(): boolean {
    return this.getLatest().__selected;
  }

  setSelected(selected: boolean) {
    this.getWritable().__selected = selected;
  }
}

type CreateBlockContainerNodeProps = {
  titleNode?: (TextNode | LineBreakNode | LexicalNode)[];
  childContainerNodes?: BlockContainerNode[];
  open?: boolean;
  prepopulateChildren?: boolean;
};

export function $createBlockContainerNode({
  titleNode,
  childContainerNodes,
  prepopulateChildren = true,
}: Partial<CreateBlockContainerNodeProps> = {}): BlockContainerNode {
  // In some cases (when PASTING for example), children exist
  if (prepopulateChildren) {
    const title = $createBlockTextNode(titleNode);
    const childContainer = $createBlockChildContainerNode(childContainerNodes);
    const container = new BlockContainerNode();
    return container.append(title, childContainer);
  } else {
    const container = new BlockContainerNode();
    return container;
  }
}

export function $isBlockContainerNode(
  node: LexicalNode | null | undefined,
): node is BlockContainerNode {
  return node instanceof BlockContainerNode;
}

export function $findParentBlockContainer(node: LexicalNode) {
  return $findMatchingParent(
    node,
    (node: LexicalNode): node is BlockContainerNode => {
      return $isBlockContainerNode(node);
    },
  ) as BlockContainerNode | null;
}
