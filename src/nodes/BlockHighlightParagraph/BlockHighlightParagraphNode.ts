import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  LineBreakNode,
  NodeKey,
  Spread,
  TextNode,
} from "lexical";
import { BlockTextNode, type SerializedBlockContainerNode } from "../Block";
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
import { $createBlockHighlightParagraphQuoteNode } from "./BlockHighlightParagraphQuoteNode";
import {
  $isBlockHighlightSliceNode,
  type BlockHighlightSliceNode,
} from "../BlockHighlightSlice";
import {
  $createBlockHighlightParagraphCommentNode,
  $isBlockHighlightParagraphCommentNode,
  type BlockHighlightParagraphCommentNode,
} from "./BlockHighlightParagraphCommentNode";

export const BLOCK_HIGHLIGHT_PARAGRAPH_TYPE =
  "block-highlight-paragraph" as const;

export const SerializedBlockHighlightParagraphNodeSchema: z.ZodType<SerializedBlockHighlightParagraphNode> =
  ExtendableSerializedBlockContainerNodeSchema.extend({
    type: z.literal(BLOCK_HIGHLIGHT_PARAGRAPH_TYPE),
    highlightText: z.string(),
    highlightUrl: z.string().url(),
    highlightRangePath: z.string(),
  });

export type SerializedBlockHighlightParagraphNode = Prettify<
  Spread<
    {
      type: typeof BLOCK_HIGHLIGHT_PARAGRAPH_TYPE;
      highlightText: string;
      highlightUrl: string;
      highlightRangePath: string;
    },
    SerializedBlockContainerNode
  >
>;

export class BlockHighlightParagraphNode extends BlockContainerNode {
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

  static clone(node: BlockHighlightParagraphNode): BlockHighlightParagraphNode {
    return new BlockHighlightParagraphNode({
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
    return BLOCK_HIGHLIGHT_PARAGRAPH_TYPE;
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

  updateDOM(
    prevNode: BlockHighlightParagraphNode,
    dom: HTMLDivElement,
  ): boolean {
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(
    serializedNode: SerializedBlockHighlightParagraphNode,
  ): BlockHighlightParagraphNode {
    const container = super.importJSON(serializedNode);
    const blockHighlightParagraphNode = $createBlockHighlightParagraphNode({
      prepopulateChildren: false,
      highlightText: serializedNode.highlightText,
      highlightUrl: serializedNode.highlightUrl,
      highlightRangePath: serializedNode.highlightRangePath,
    });
    const textNode = container.getBlockTextNode();

    // Just to highlight necessary parts based on highlight-comment
    const childContainerNode = container.getBlockChildContainerNode();
    const childContainers = childContainerNode?.getChildren();

    const commentContainers = childContainers?.filter((childContainer) =>
      $isBlockHighlightSliceNode(childContainer),
    ) as BlockHighlightSliceNode[];

    let highlightedText = serializedNode.highlightText;
    for (const comment of commentContainers) {
      console.log("comment.getHighlightText()", comment.getHighlightText());

      const regex = new RegExp(comment.getHighlightText(), "g");
      // TODO There is a problem with doing this way. If highlight-paragraph
      // has multiple text with highlight-comment words it will highlight all.
      highlightedText = highlightedText.replace(
        regex,
        (matched) => `==${matched}==`,
      );
    }

    const quoteNode = $createBlockHighlightParagraphQuoteNode();
    $convertFromMarkdownString(highlightedText, CUSTOM_TRANSFORMERS, quoteNode);

    const commentNode = $createBlockHighlightParagraphCommentNode();

    textNode?.append(quoteNode, commentNode);

    blockHighlightParagraphNode.append(textNode!, childContainerNode!);
    container.remove();

    blockHighlightParagraphNode.setId(serializedNode.id);
    blockHighlightParagraphNode.setOpen(serializedNode.open);
    return blockHighlightParagraphNode;
  }

  exportJSON(): SerializedBlockHighlightParagraphNode {
    const blockHighlightParagraphNode = this.getLatest();
    const titleNode = blockHighlightParagraphNode
      .getBlockTextNode()
      ?.getChildren()
      .find((node) => $isBlockHighlightParagraphCommentNode(node)) as
      | BlockHighlightParagraphCommentNode
      | undefined;
    const title =
      titleNode?.getChildren().map((node) => node.exportJSON()) ?? [];

    return {
      ...super.exportJSON(),
      highlightText: blockHighlightParagraphNode.getHighlightText(),
      highlightUrl: blockHighlightParagraphNode.getHighlightUrl(),
      highlightRangePath: blockHighlightParagraphNode.getHighlightRangePath(),
      type: BLOCK_HIGHLIGHT_PARAGRAPH_TYPE,
      title: JSON.stringify(title),
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

export function $createBlockHighlightParagraphNode({
  highlightText,
  highlightUrl,
  highlightRangePath,
  titleNode,
  childContainerNodes,
  prepopulateChildren = true,
}: CreateBlockContainerNodeProps): BlockHighlightParagraphNode {
  if (prepopulateChildren) {
    const blockContainerNode = $createBlockContainerNode({
      prepopulateChildren,
      titleNode,
      childContainerNodes,
    });
    const blockHighlightParagraphNode = new BlockHighlightParagraphNode({
      highlightText,
      highlightUrl,
      highlightRangePath,
    });
    const newBlockComment = blockHighlightParagraphNode.append(
      ...blockContainerNode.getChildren(),
    );
    blockContainerNode.remove();
    return newBlockComment;
  } else {
    const blockComment = new BlockHighlightParagraphNode({
      highlightText,
      highlightUrl,
      highlightRangePath,
    });
    return blockComment;
  }
}

export function $isBlockHighlightParagraphNode(
  node: LexicalNode | null | undefined,
): node is BlockHighlightParagraphNode {
  return node instanceof BlockHighlightParagraphNode;
}
