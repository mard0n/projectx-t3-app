import type {
  NodeKey,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  Spread,
  LineBreakNode,
  TextNode,
} from "lexical";
import {
  BlockContainerNode,
  type SerializedBlockContainerNode,
} from "../Block";
import { z } from "zod";
import type { Prettify } from "~/utils/types";
import { addClassNamesToElement } from "@lexical/utils";
import {
  $createBlockContainerNode,
  ExtendableSerializedBlockContainerNodeSchema,
} from "../Block/BlockContainer";

export const BLOCK_PARAGRAPH_TYPE = "block-paragraph" as const;

export const SerializedBlockParagraphNodeSchema: z.ZodType<SerializedBlockParagraphNode> =
  ExtendableSerializedBlockContainerNodeSchema.extend({
    type: z.literal(BLOCK_PARAGRAPH_TYPE),
  });

export type SerializedBlockParagraphNode = Prettify<
  Spread<
    {
      type: typeof BLOCK_PARAGRAPH_TYPE;
    },
    SerializedBlockContainerNode
  >
>;

export class BlockParagraphNode extends BlockContainerNode {
  constructor({
    key,
    open,
    id,
    selected,
  }: Partial<{
    key: NodeKey;
    open: boolean;
    id: string;
    selected: boolean;
  }> = {}) {
    super({ open, selected, id, key });
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

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = super.createDOM(config, editor);
    const theme = config.theme;
    const className = theme.blockParagraph as string;
    if (className !== undefined) {
      addClassNamesToElement(dom, className);
    }
    return dom;
  }

  updateDOM(prevNode: BlockParagraphNode, dom: HTMLDivElement): boolean {
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(
    serializedNode: SerializedBlockParagraphNode,
  ): BlockParagraphNode {
    const container = super.importJSON(serializedNode);
    const blockheaderNode = $createBlockParagraphNode({
      prepopulateChildren: false,
    });
    const containerChildren = container.getChildren();
    blockheaderNode.append(...containerChildren);
    container.remove();

    blockheaderNode.setId(serializedNode.id);
    blockheaderNode.setOpen(serializedNode.open);
    blockheaderNode.setDirection(serializedNode.direction);
    blockheaderNode.setIndent(serializedNode?.indent ?? 0);
    blockheaderNode.setFormat(serializedNode?.format ?? "");
    return blockheaderNode;
  }

  exportJSON(): SerializedBlockParagraphNode {
    return {
      ...super.exportJSON(),
      type: BLOCK_PARAGRAPH_TYPE,
      version: 1,
    };
  }
}

type CreateBlockContainerNodeProps = {
  titleNode: (TextNode | LineBreakNode | LexicalNode)[];
  childContainerNodes: BlockContainerNode[];
  prepopulateChildren: boolean;
};

export function $createBlockParagraphNode({
  titleNode,
  childContainerNodes,
  prepopulateChildren = true,
}: Partial<CreateBlockContainerNodeProps> = {}): BlockParagraphNode {
  if (prepopulateChildren) {
    const blockContainerNode = $createBlockContainerNode({
      prepopulateChildren,
      titleNode,
      childContainerNodes,
    });
    const blockParagraphNode = new BlockParagraphNode();
    const newBlockParagraph = blockParagraphNode.append(
      ...blockContainerNode.getChildren(),
    );
    blockContainerNode.remove();
    return newBlockParagraph;
  } else {
    const blockParagraph = new BlockParagraphNode();
    return blockParagraph;
  }
}

export function $isBlockParagraphNode(
  node: LexicalNode | null | undefined,
): node is BlockParagraphNode {
  return node instanceof BlockParagraphNode;
}
