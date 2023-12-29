/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createCPChildContainerNode,
  $createCPTitleNode,
  $isCPChildContainerNode,
  $isCPTitleNode,
} from ".";
import type { CPChildContainerNode, CPTitleNode } from ".";
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
} from "lexical";
import { $parseSerializedNode, ElementNode } from "lexical";
import { $findMatchingParent } from "@lexical/utils";
import type { RouterOutputs, Unpacked } from "~/utils/api";

type NoteGetAllOutput = RouterOutputs["note"]["getAll"];

export type SerializedCPContainerNode = Spread<
  Unpacked<NoteGetAllOutput>,
  SerializedElementNode
>;

function convertCPContainerElement(): DOMConversionOutput {
  const node = $createCPContainerNode();
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
export class CPContainerNode extends ElementNode {
  __open: boolean;
  __id: string;

  constructor(open: boolean, key?: NodeKey, id?: string) {
    super(key);
    this.__open = open;
    this.__id = id ?? crypto.randomUUID();
  }

  static getType(): string {
    return "container";
  }

  static clone({ __open, __key, __id }: CPContainerNode): CPContainerNode {
    return new CPContainerNode(__open, __key, __id);
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = document.createElement("div");
    dom.classList.add("collapsible-paragraph-container");
    if (this.__open) {
      dom.classList.add("open");
    } else {
      dom.classList.add("closed");
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
    });
    return dom;
  }
  updateDOM(prevNode: CPContainerNode, dom: HTMLDivElement): boolean {
    if (prevNode.__open !== this.__open) {
      dom.classList.remove("open");
      dom.classList.remove("closed");
      if (this.__open) {
        dom.classList.add("open");
      } else {
        dom.classList.add("closed");
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
    serializedNode: SerializedCPContainerNode,
  ): CPContainerNode {
    let node;

    // To avoid issues with parseSerializedNode. In some cases (when PASTING for example), children exist
    if (serializedNode.children?.length) {
      node = $createCPContainerNode({ prepopulateChildren: false });
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
        }) as CPContainerNode[]) || [];
      node = $createCPContainerNode({
        titleNode: textNode,
        childContainerNodes: children,
      });
    }

    node.setId(serializedNode.id || crypto.randomUUID());
    node.setOpen(serializedNode.open);
    node.setDirection(serializedNode.direction);
    node.setIndent(serializedNode.indent);
    node.setFormat(serializedNode.format);
    return node;
  }

  exportJSON(): SerializedCPContainerNode {
    const titleNode = this.getTitleNode();
    const titleNodeContent =
      titleNode
        ?.getChildren<TextNode | LineBreakNode>()
        .map((node) => node.exportJSON()) ?? [];

    const childContainerNode = this.getChildContainerNode();
    const childContainerNodeContent =
      childContainerNode
        ?.getChildren<CPContainerNode>()
        .map((node) => node.exportJSON()) ?? [];

    const parentNode = this.getParent<LexicalNode>();
    let parentId: string | null = null;
    if (parentNode) {
      const parentContainer = $findMatchingParent(
        parentNode,
        (node: LexicalNode): node is CPContainerNode =>
          $isCPContainerNode(node),
      ) as CPContainerNode | null;
      if (parentContainer) {
        parentId = parentContainer.getId();
      }
    }
    const indexWithinParent = this.getIndexWithinParent();

    return {
      ...super.exportJSON(),
      title: JSON.stringify(titleNodeContent),
      childNotes: childContainerNodeContent, // Used only for debugging purposes
      parentId,
      indexWithinParent,
      open: this.getOpen(),
      type: "container",
      id: this.getId(),
      version: 1,
    };
  }

  // Mutation
  getTitleNode() {
    return this.getLatest()
      .getChildren()
      .find((node) => $isCPTitleNode(node)) as CPTitleNode | undefined;
  }

  getChildContainerNode() {
    return this.getLatest()
      .getChildren()
      .find((node) => $isCPChildContainerNode(node)) as
      | CPChildContainerNode
      | undefined;
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
}

type CreateCPContainerNodeProps = {
  titleNode?: (TextNode | LineBreakNode | LexicalNode)[];
  childContainerNodes?: CPContainerNode[];
  open?: boolean;
  prepopulateChildren?: boolean;
};

export function $createCPContainerNode({
  titleNode,
  childContainerNodes,
  open = true,
  prepopulateChildren = true,
}: Partial<CreateCPContainerNodeProps> = {}): CPContainerNode {
  // In some cases (when PASTING for example), children exist
  if (prepopulateChildren) {
    const title = $createCPTitleNode(titleNode);
    const childContainer = $createCPChildContainerNode(childContainerNodes);
    const container = new CPContainerNode(open);
    return container.append(title, childContainer);
  } else {
    const container = new CPContainerNode(open);
    return container;
  }
}

export function $isCPContainerNode(
  node: LexicalNode | null | undefined,
): node is CPContainerNode {
  return node instanceof CPContainerNode;
}
