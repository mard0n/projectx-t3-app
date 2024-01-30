import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  LineBreakNode,
  NodeKey,
  Spread,
  TextNode,
} from "lexical";
import {
  $createBlockTextNode,
  type SerializedBlockContainerNode,
} from "../Block";
import { z } from "zod";
import type { Prettify } from "~/utils/types";
import {
  $createBlockContainerNode,
  BlockContainerNode,
  ExtendableSerializedBlockContainerNodeSchema,
} from "../Block/BlockContainer";
import { addClassNamesToElement } from "@lexical/utils";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { CUSTOM_TRANSFORMERS } from "~/utils/markdown-transformers";

export const BLOCK_HIGHLIGHT_COMMENT_TYPE = "block-highlight-comment" as const;

export const SerializedBlockHighlightCommentNodeSchema: z.ZodType<SerializedBlockHighlightCommentNode> =
  ExtendableSerializedBlockContainerNodeSchema.extend({
    type: z.literal(BLOCK_HIGHLIGHT_COMMENT_TYPE),
    highlightText: z.string(),
    highlightUrl: z.string().url(),
    highlightRangePath: z.string(),
  });

export type SerializedBlockHighlightCommentNode = Prettify<
  Spread<
    {
      type: typeof BLOCK_HIGHLIGHT_COMMENT_TYPE;
      highlightText: string;
      highlightUrl: string;
      highlightRangePath: string;
    },
    SerializedBlockContainerNode
  >
>;

export class BlockHighlightCommentNode extends BlockContainerNode {
  __highlightText: string;
  __highlightUrl: string;
  __highlightRangePath: string;

  constructor({
    key,
    open,
    id,
    selected,
    highlightText,
    highlightUrl,
    highlightRangePath,
  }: {
    key?: NodeKey;
    open?: boolean;
    id?: string;
    selected?: boolean;
    highlightText: string;
    highlightUrl: string;
    highlightRangePath: string;
  }) {
    super({ open, selected, id, key });
    this.__highlightText = highlightText ?? "";
    this.__highlightUrl = highlightUrl ?? "";
    this.__highlightRangePath = highlightRangePath ?? "";
  }

  static clone(node: BlockHighlightCommentNode): BlockHighlightCommentNode {
    return new BlockHighlightCommentNode({
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
    return BLOCK_HIGHLIGHT_COMMENT_TYPE;
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = super.createDOM(config, editor);
    const theme = config.theme;
    const className = theme.blockHighlightComment as string;
    if (className !== undefined) {
      addClassNamesToElement(dom, className);
    }
    return dom;
  }

  updateDOM(prevNode: BlockHighlightCommentNode, dom: HTMLDivElement): boolean {
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(
    serializedNode: SerializedBlockHighlightCommentNode,
  ): BlockHighlightCommentNode {
    const container = super.importJSON(serializedNode);
    const blockHighlightCommentNode = $createBlockHighlightCommentNode({
      prepopulateChildren: false,
      highlightText: serializedNode.highlightText,
      highlightUrl: serializedNode.highlightUrl,
      highlightRangePath: serializedNode.highlightRangePath,
    });
    const textNode = $createBlockTextNode();
    $convertFromMarkdownString(
      serializedNode.highlightText,
      CUSTOM_TRANSFORMERS,
      textNode,
    );

    const childContainerNode = container.getBlockChildContainerNode();
    blockHighlightCommentNode.append(textNode, childContainerNode!);
    container.remove();

    blockHighlightCommentNode.setId(serializedNode.id);
    blockHighlightCommentNode.setOpen(serializedNode.open);
    return blockHighlightCommentNode;
  }

  exportJSON(): SerializedBlockHighlightCommentNode {
    const blockHighlightCommentNode = this.getLatest();

    return {
      ...super.exportJSON(),
      highlightText: blockHighlightCommentNode.getHighlightText(),
      highlightUrl: blockHighlightCommentNode.getHighlightUrl(),
      highlightRangePath: blockHighlightCommentNode.getHighlightRangePath(),
      type: BLOCK_HIGHLIGHT_COMMENT_TYPE,
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

type CreateBlockContainerNodeProps = {
  titleNode?: (TextNode | LineBreakNode | LexicalNode)[];
  childContainerNodes?: BlockContainerNode[];
  prepopulateChildren?: boolean;
  highlightText: string;
  highlightUrl: string;
  highlightRangePath: string;
};

export function $createBlockHighlightCommentNode({
  highlightText,
  highlightUrl,
  highlightRangePath,
  titleNode,
  childContainerNodes,
  prepopulateChildren = true,
}: CreateBlockContainerNodeProps): BlockHighlightCommentNode {
  if (prepopulateChildren) {
    const blockContainerNode = $createBlockContainerNode({
      prepopulateChildren,
      titleNode,
      childContainerNodes,
    });
    const blockHighlightCommentNode = new BlockHighlightCommentNode({
      highlightText,
      highlightUrl,
      highlightRangePath,
    });
    const newBlockComment = blockHighlightCommentNode.append(
      ...blockContainerNode.getChildren(),
    );
    blockContainerNode.remove();
    return newBlockComment;
  } else {
    const blockComment = new BlockHighlightCommentNode({
      highlightText,
      highlightUrl,
      highlightRangePath,
    });
    return blockComment;
  }
}

export function $isBlockHighlightCommentNode(
  node: LexicalNode | null | undefined,
): node is BlockHighlightCommentNode {
  return node instanceof BlockHighlightCommentNode;
}
