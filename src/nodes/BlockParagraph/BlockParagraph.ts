import type {
  NodeKey,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
} from "lexical";
import { z } from "zod";
import {
  BlockContainerNode,
  SerializedBlockContainerNodeSchema,
} from "../Block";

export const BLOCK_PARAGRAPH_TYPE = "block-paragraph" as const;

export const SerializedBlockParagraphNodeSchema =
  SerializedBlockContainerNodeSchema.extend({
    type: z.literal(BLOCK_PARAGRAPH_TYPE),
  });

export type SerializedBlockParagraphNode = z.infer<
  typeof SerializedBlockParagraphNodeSchema
>;

export class BlockParagraphNode extends BlockContainerNode {
  constructor({
    open,
    key,
    id,
    selected,
  }: {
    open?: boolean;
    selected?: boolean;
    key?: NodeKey;
    id?: string;
  } = {}) {
    super({ key, open, id, selected });
  }

  static clone(node: BlockParagraphNode): BlockParagraphNode {
    return new BlockParagraphNode({
      key: node.__key,
      open: node.__open,
      id: node.__id,
      selected: node.__selected,
    });
  }

  static getType(): string {
    return BLOCK_PARAGRAPH_TYPE;
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = super.createDOM(config, editor);
    return dom;
  }

  updateDOM(prevNode: BlockParagraphNode, dom: HTMLDivElement): boolean {
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(
    serializedNode: SerializedBlockParagraphNode,
  ): BlockParagraphNode {
    const containerNode = super.importJSON(serializedNode);
    const paragraph = $createBlockParagraphNode();
    const content = containerNode.getBlockContentNode();
    const childContainer = containerNode.getBlockChildContainerNode();
    paragraph.append(content, childContainer);
    containerNode.remove();
    return paragraph;
  }

  exportJSON(): SerializedBlockParagraphNode {
    return {
      ...super.exportJSON(),
      type: BLOCK_PARAGRAPH_TYPE,
      version: 1,
    };
  }
}

export function $createBlockParagraphNode(): BlockParagraphNode {
  const container = new BlockParagraphNode();
  return container;
}

export function $isBlockParagraphNode(
  node: LexicalNode | null | undefined,
): node is BlockParagraphNode {
  return node instanceof BlockParagraphNode;
}
