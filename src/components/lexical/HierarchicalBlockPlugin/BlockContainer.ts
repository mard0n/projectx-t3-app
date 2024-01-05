/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { $findMatchingParent } from "@lexical/utils";
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
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  LineBreakNode,
  TextNode,
  SerializedTextNode,
  SerializedLineBreakNode,
  RootNode,
} from "lexical";
import { $parseSerializedNode, ElementNode } from "lexical";
import { z } from "zod";

export const serializedBlockContainerNodeSchema: z.ZodSchema<SerializedBlockContainerNode> =
  z.lazy(() =>
    z.object({
      type: z.enum([CONTAINER_BLOCK_TYPE]),
      version: z.number(),
      id: z.string(),
      open: z.boolean(),
      title: z.string(),
      childNotes: z.array(serializedBlockContainerNodeSchema),
      parentId: z.string().nullable(),
      indexWithinParent: z.number(),
      children: z.array(
        z.object({
          type: z.string(),
          version: z.number(),
        }),
      ),
      direction: z.union([z.literal("ltr"), z.literal("rtl")]),
      format: z.union([
        z.literal("left"),
        z.literal("start"),
        z.literal("center"),
        z.literal("right"),
        z.literal("end"),
        z.literal("justify"),
        z.literal(""),
      ]),
      indent: z.number(),
    }),
  );

export type SerializedBlockContainerNode = Spread<
  {
    id: string;
    open: boolean;
    title: string;
    childNotes: SerializedBlockContainerNode[]; // HACK: Using it when deserializing (To Not to use children) when passing down from DB
    parentId: string | null;
    indexWithinParent: number;
    type: typeof CONTAINER_BLOCK_TYPE;
  },
  SerializedElementNode
>;

export const CONTAINER_BLOCK_TYPE = "block-container" as const;

function convertCPContainerElement(): DOMConversionOutput {
  const node = $createBlockContainerNode();
  // if (element.style) {
  //   node.setFormat(element.style.textAlign as ElementFormatType);
  //   const indent = parseInt(element.style.textIndent, 10) / 20;
  //   if (indent > 0) {
  //     node.setIndent(indent);
  //   }
  // }
  return { node };
}

/** @noInheritDoc */
export class BlockContainerNode extends ElementNode {
  __open: boolean;
  __id: string;
  __selected: boolean;

  constructor(props: {__open: boolean, __selected?: boolean, __key?: NodeKey,  __id?: string}) {
    const {__open, __key, __id, __selected} = props;
    super(__key); 
    this.__open = __open ?? true
    this.__id = __id ?? crypto.randomUUID();
    this.__selected = __selected ?? false
  }

  static getType(): string {
    return CONTAINER_BLOCK_TYPE;
  }

  static clone({ __open, __key, __id, __selected }: BlockContainerNode): BlockContainerNode {
    return new BlockContainerNode({__open, __key, __id, __selected});
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = document.createElement("div");
    dom.classList.add(CONTAINER_BLOCK_TYPE);

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

    const hasPseudoElemClicked = (e: MouseEvent): boolean => {
      const target = e.currentTarget ?? e.target;
      if (!target) return false;
      const after = getComputedStyle(target as Element, "::before");

      // Then we parse out the dimensions
      const atop = Number(after.getPropertyValue("top").slice(0, -2));
      const aleft = Number(after.getPropertyValue("left").slice(0, -2));
      const aborderTopWidth = Number(
        after.getPropertyValue("border-top-width").slice(0, -2),
      );
      const aborderBottomWidth = Number(
        after.getPropertyValue("border-bottom-width").slice(0, -2),
      );
      const aborderLeftWidth = Number(
        after.getPropertyValue("border-left-width").slice(0, -2),
      );
      const aborderRightWidth = Number(
        after.getPropertyValue("border-right-width").slice(0, -2),
      );

      const bbox = (target as Element).getBoundingClientRect();
      const ex = e.clientX - bbox.left;
      const ey = e.clientY - bbox.top;
      if (
        ex >= aleft &&
        ex <= aleft + aborderLeftWidth + aborderRightWidth &&
        ey >= atop &&
        ey <= atop + aborderTopWidth + aborderBottomWidth
      ) {
        return true;
      }
      return false;
    };

    dom.addEventListener("click", (event) => {
      if (hasPseudoElemClicked(event)) {
        editor.update(() => {
          this.toggleOpen();
        });
      }
    }); // TODO: Make this event more efficient. RN all dom events have own eventhandler
    return dom;
  }

  updateDOM(prevNode: BlockContainerNode, dom: HTMLDivElement): boolean {
    if (prevNode.__open !== this.__open) {
      dom.classList.remove("open");
      dom.classList.remove("closed");
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

  static importDOM(): DOMConversionMap | null {
    return {
      div: () => ({
        conversion: convertCPContainerElement,
        priority: 0,
      }),
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);
    // if (element && isHTMLElement(element)) {
    //   element.setAttribute("open", this.__open.toString());
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
    const titleNode = this.getChildBlockTextNode();
    const titleNodeContent =
      titleNode?.getChildren().map((node) => node.exportJSON()) ?? [];

    const childContainerNode = this.getChildBlockChildContainerNode();
    const childContainerNodeContent =
      childContainerNode
        ?.getChildren<BlockContainerNode>()
        .map((node) => node.exportJSON()) ?? [];

    const parentBlockContainerNodeId = this.getParentCPContainer()?.getId();

    const indexWithinParent = this.getIndexWithinParent();

    const children = this.getChildren().map((node) => node.exportJSON());

    return {
      ...super.exportJSON(),
      title: JSON.stringify(titleNodeContent),
      childNotes: childContainerNodeContent, // Used only for debugging purposes
      parentId: parentBlockContainerNodeId ?? null,
      indexWithinParent,
      open: this.getOpen(),
      type: CONTAINER_BLOCK_TYPE,
      id: this.getId(),
      version: 1,
      direction: super.exportJSON().direction ?? "ltr",
      format: super.exportJSON().format ?? "left",
      indent: super.exportJSON().indent ?? 0,
      children,
    };
  }

  // Mutation
  getChildBlockTextNode() {
    // Weird bug with getBlockTextNode
    return this.getLatest()
      .getChildren()
      .find((node): node is BlockTextNode => $isBlockTextNode(node));
  }

  getChildBlockChildContainerNode() {
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
  open = true,
  prepopulateChildren = true,
}: Partial<CreateBlockContainerNodeProps> = {}): BlockContainerNode {
  // In some cases (when PASTING for example), children exist
  if (prepopulateChildren) {
    const title = $createBlockTextNode(titleNode);
    const childContainer = $createBlockChildContainerNode(childContainerNodes);
    const container = new BlockContainerNode({__open: open});
    return container.append(title, childContainer);
  } else {
    const container = new BlockContainerNode({__open: open});
    return container;
  }
}

export function $isBlockContainerNode(
  node: LexicalNode | null | undefined,
): node is BlockContainerNode {
  return node instanceof BlockContainerNode;
}

export function $findParentCPContainer(node: LexicalNode) {
  return $findMatchingParent(
    node,
    (node: LexicalNode): node is BlockContainerNode => {
      return $isBlockContainerNode(node);
    },
  ) as BlockContainerNode | null;
}
