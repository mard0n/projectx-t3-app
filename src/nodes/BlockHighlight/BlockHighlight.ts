import type {
  NodeKey,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
} from "lexical";
import { $parseSerializedNode } from "lexical";
import { z } from "zod";
import {
  BlockContainerNode,
  $createBlockChildContainerNode,
  SerializedBlockContainerNodeSchema,
} from "../Block";
import { $createBlockQuoteDecoratorNode } from "./BlockQuoteDecorator";

export const BLOCK_HIGHLIGHT_TYPE = "block-highlight" as const;

export const SerializedBlockHighlightNodeSchema =
  SerializedBlockContainerNodeSchema.extend({
    type: z.literal(BLOCK_HIGHLIGHT_TYPE),
    highlightText: z.string().nullable(),
    highlightUrl: z.string().url().nullable(),
    highlightRangePath: z.string().nullable(),
  });

export type SerializedBlockHighlightNode = z.infer<
  typeof SerializedBlockHighlightNodeSchema
>;

export class BlockHighlightNode extends BlockContainerNode {
  __highlightText: string;
  __highlightUrl: string;
  __highlightRangePath: string;

  constructor({
    open,
    key,
    id,
    selected,
    highlightText,
    highlightUrl,
    highlightRangePath,
  }: {
    open?: boolean;
    selected?: boolean;
    key?: NodeKey;
    id?: string;
    highlightText?: string;
    highlightUrl?: string;
    highlightRangePath?: string;
  } = {}) {
    super({ key, open, id, selected });
    this.__highlightText = highlightText ?? "";
    this.__highlightUrl = highlightUrl ?? "";
    this.__highlightRangePath = highlightRangePath ?? "";
  }

  static clone(node: BlockHighlightNode): BlockHighlightNode {
    return new BlockHighlightNode({
      key: node.__key,
      open: node.__open,
      id: node.__id,
      selected: node.__selected,
      highlightText: node.__highlightText,
      highlightUrl: node.__highlightUrl,
      highlightRangePath: node.__highlightRangePath,
    });
  }

  static getType(): string {
    return BLOCK_HIGHLIGHT_TYPE;
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = super.createDOM(config, editor);
    return dom;
  }

  updateDOM(prevNode: BlockHighlightNode, dom: HTMLDivElement): boolean {
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(
    serializedNode: SerializedBlockHighlightNode,
  ): BlockHighlightNode {
    const containerNode = $createBlockHighlightNode();

    const contentNode = $createBlockQuoteDecoratorNode(
      serializedNode.content,
      serializedNode?.highlightText ?? "",
    );

    const childHighlightNode = $createBlockChildContainerNode();
    const containerNodes =
      (serializedNode.childBlocks?.map((node) => {
        return $parseSerializedNode(node);
      }) as BlockHighlightNode[]) || [];
    childHighlightNode.append(...containerNodes);

    containerNode.append(contentNode, childHighlightNode);
    containerNode.setId(serializedNode.id);
    containerNode.setOpen(serializedNode.open);
    containerNode.setHighlightText(serializedNode?.highlightText ?? "");
    containerNode.setHighlightUrl(serializedNode?.highlightUrl ?? "");
    containerNode.setHighlightRangePath(
      serializedNode?.highlightRangePath ?? "",
    );
    return containerNode;
  }

  exportJSON(): SerializedBlockHighlightNode {
    const highlightText = this.getHighlightText();
    const highlightUrl = this.getHighlightUrl();
    const highlightRangePath = this.getHighlightRangePath();

    return {
      ...super.exportJSON(),
      highlightText,
      highlightUrl,
      highlightRangePath,
      type: BLOCK_HIGHLIGHT_TYPE,
      version: 1,
    };
  }

  getHighlightText() {
    return this.getLatest().__highlightText;
  }

  setHighlightText(highlightText: string) {
    this.getWritable().__highlightText = highlightText;
  }

  getHighlightUrl() {
    return this.getLatest().__highlightUrl;
  }

  setHighlightUrl(highlightUrl: string) {
    this.getWritable().__highlightUrl = highlightUrl;
  }

  getHighlightRangePath() {
    return this.getLatest().__highlightRangePath;
  }

  setHighlightRangePath(highlightRangePath: string) {
    this.getWritable().__highlightRangePath = highlightRangePath;
  }
}

export function $createBlockHighlightNode(): BlockHighlightNode {
  const container = new BlockHighlightNode();
  return container;
}

export function $isBlockHighlightNode(
  node: LexicalNode | null | undefined,
): node is BlockHighlightNode {
  return node instanceof BlockHighlightNode;
}
