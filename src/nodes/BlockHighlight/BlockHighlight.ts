import {
  type NodeKey,
  type EditorConfig,
  type LexicalNode,
  type LexicalEditor,
  $parseSerializedNode,
} from "lexical";
import { z } from "zod";
import {
  $createBlockChildContainerNode,
  BlockContainerNode,
  SerializedBlockContainerNodeSchema,
} from "../Block";
import { $createBlockHighlightContentNode } from "./BlockHighlightContent";
import { type CustomTheme } from "~/utils/lexical/theme";
import { addClassNamesToElement } from "@lexical/utils";
import {
  $createBlockQuoteDecoratorNode,
  type BlockQuoteDecoratorNode,
} from ".";

export const BLOCK_HIGHLIGHT_TYPE = "block-highlight" as const;

const RectSchema = z.object({
  bottom: z.number(),
  height: z.number(),
  left: z.number(),
  right: z.number(),
  top: z.number(),
  width: z.number(),
  x: z.number(),
  y: z.number(),
});

type RectType = z.infer<typeof RectSchema>;

export const SerializedBlockHighlightNodeSchema =
  SerializedBlockContainerNodeSchema.extend({
    type: z.literal(BLOCK_HIGHLIGHT_TYPE),
    properties: z.object({
      highlightText: z.string(),
      highlightPath: z.string().url().nullable(),
      highlightRect: RectSchema,
      commentText: z.string(),
      commentRect: RectSchema,
      contextRect: RectSchema,
    }),
  });

export type SerializedBlockHighlightNode = z.infer<
  typeof SerializedBlockHighlightNodeSchema
>;

type BlockHighlightProps = z.infer<
  typeof SerializedBlockHighlightNodeSchema.shape.properties
>;

export class BlockHighlightNode extends BlockContainerNode {
  __highlightText: string;
  __highlightPath: string | null;
  __highlightRect: RectType;
  __commentText: string;
  __commentRect: RectType;
  __contextRect: RectType;

  constructor({
    open,
    key,
    id,
    selected,
    highlightText,
    highlightPath,
    highlightRect,
    commentText,
    commentRect,
    contextRect,
  }: {
    highlightText: string;
    highlightPath: string | null;
    highlightRect: RectType;
    commentText: string;
    commentRect: RectType;
    contextRect: RectType;
    open?: boolean;
    selected?: boolean;
    key?: NodeKey;
    id?: string;
  }) {
    super({ key, open, id, selected });
    this.__highlightText = highlightText;
    this.__highlightPath = highlightPath;
    this.__highlightRect = highlightRect;
    this.__commentText = commentText;
    this.__commentRect = commentRect;
    this.__contextRect = contextRect;
  }

  static clone(node: BlockHighlightNode): BlockHighlightNode {
    return new BlockHighlightNode({
      key: node.__key,
      open: node.__open,
      id: node.__id,
      selected: node.__selected,
      highlightText: node.__highlightText,
      highlightPath: node.__highlightPath,
      highlightRect: node.__highlightRect,
      commentText: node.__commentText,
      commentRect: node.__commentRect,
      contextRect: node.__contextRect,
    });
  }

  static getType(): string {
    return BLOCK_HIGHLIGHT_TYPE;
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = super.createDOM(config, editor);
    const theme = config.theme as CustomTheme;
    const blockTextClassNames = theme.blockHighlight;
    if (blockTextClassNames) {
      const blockContainer = blockTextClassNames.container;
      addClassNamesToElement(dom, blockContainer);
    }
    return dom;
  }

  updateDOM(prevNode: BlockHighlightNode, dom: HTMLDivElement): boolean {
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(
    serializedNode: SerializedBlockHighlightNode,
  ): BlockHighlightNode {
    const quoteDecorator = $createBlockQuoteDecoratorNode();

    const containerNodes =
      (serializedNode.childBlocks?.map((node) => {
        return $parseSerializedNode(node);
      }) as BlockContainerNode[]) || [];

    const container = $createBlockHighlightNode(
      serializedNode.properties,
      quoteDecorator,
      containerNodes,
    );
    container.setId(serializedNode.id);
    container.setOpen(serializedNode.open);
    container.setWebUrl(serializedNode.webUrl);
    return container;
  }

  exportJSON(): SerializedBlockHighlightNode {
    return {
      ...super.exportJSON(),
      type: BLOCK_HIGHLIGHT_TYPE,
      version: 1,
      properties: {
        highlightText: this.getHighlightText(),
        highlightPath: this.getHighlightPath(),
        highlightRect: this.getHighlightRect(),
        commentText: this.getCommentText(),
        commentRect: this.getCommentRect(),
        contextRect: this.getContextRect(),
      },
    };
  }

  getId(): string {
    return this.getLatest().__id;
  }

  getHighlightText(): string {
    return this.getLatest().__highlightText;
  }
  getHighlightPath(): string | null {
    return this.getLatest().__highlightPath;
  }
  getHighlightRect(): RectType {
    return this.getLatest().__highlightRect;
  }
  getCommentText(): string {
    return this.getLatest().__commentText;
  }
  setCommentText(commentText: string) {
    this.getWritable().__commentText = commentText;
  }
  getCommentRect(): RectType {
    return this.getLatest().__commentRect;
  }
  getContextRect(): RectType {
    return this.getLatest().__contextRect;
  }
}

export function $createBlockHighlightNode(
  highlightProps: BlockHighlightProps,
  contentChildNode?: BlockQuoteDecoratorNode,
  childBlocks?: BlockContainerNode[],
): BlockHighlightNode {
  const container = new BlockHighlightNode({ ...highlightProps });
  const content = $createBlockHighlightContentNode();
  const childContainer = $createBlockChildContainerNode();

  if (contentChildNode) {
    content.append(contentChildNode);
  }

  if (childBlocks?.length) {
    childContainer.append(...childBlocks);
  }

  container.append(content, childContainer);
  return container;
}

export function $isBlockHighlightNode(
  node: LexicalNode | null | undefined,
): node is BlockHighlightNode {
  return node instanceof BlockHighlightNode;
}
