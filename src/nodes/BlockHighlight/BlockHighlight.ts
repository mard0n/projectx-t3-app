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
import { $createBlockQuoteDecoratorNode, type BlockQuoteDecoratorNode } from ".";

export const BLOCK_HIGHLIGHT_TYPE = "block-highlight" as const;

const HighlightRectSchema = z.object({
  bottom: z.number(),
  height: z.number(),
  left: z.number(),
  right: z.number(),
  top: z.number(),
  width: z.number(),
  x: z.number(),
  y: z.number(),
});

type HighlightRect = z.infer<typeof HighlightRectSchema>;

export const SerializedBlockHighlightNodeSchema =
  SerializedBlockContainerNodeSchema.extend({
    type: z.literal(BLOCK_HIGHLIGHT_TYPE),
    properties: z.object({
      highlightText: z.string(),
      highlightPath: z.string().url().nullable(),
      highlightRect: HighlightRectSchema,
      highlightContextText: z.string().optional(),
      highlightContextPath: z.string().url().optional(),
      highlightContextRect: HighlightRectSchema.optional(),
    }),
  });

export type SerializedBlockHighlightNode = z.infer<
  typeof SerializedBlockHighlightNodeSchema
>;

type HighlightProps = z.infer<
  typeof SerializedBlockHighlightNodeSchema.shape.properties
>;

export class BlockHighlightNode extends BlockContainerNode {
  __highlightText: string;
  __highlightPath: string | null;
  __highlightRect: HighlightRect;
  __highlightContextText: string | undefined;
  __highlightContextPath: string | undefined;
  __highlightContextRect: HighlightRect | undefined;

  constructor({
    open,
    key,
    id,
    selected,
    highlightText,
    highlightPath,
    highlightRect,
    highlightContextText,
    highlightContextPath,
    highlightContextRect,
  }: {
    highlightText: string;
    highlightPath: string | null;
    highlightRect: HighlightRect;
    highlightContextText?: string;
    highlightContextPath?: string;
    highlightContextRect?: HighlightRect;
    open?: boolean;
    selected?: boolean;
    key?: NodeKey;
    id?: string;
  }) {
    super({ key, open, id, selected });
    this.__highlightText = highlightText;
    this.__highlightPath = highlightPath;
    this.__highlightRect = highlightRect;
    this.__highlightContextText = highlightContextText;
    this.__highlightContextPath = highlightContextPath;
    this.__highlightContextRect = highlightContextRect;
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
      highlightContextText: node.__highlightContextText,
      highlightContextPath: node.__highlightContextPath,
      highlightContextRect: node.__highlightContextRect,
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
    const quoteDecorator = $createBlockQuoteDecoratorNode(
      serializedNode.properties.highlightText,
      serializedNode.properties.highlightContextText,
    );

    const containerNodes =
      (serializedNode.childBlocks?.map((node) => {
        return $parseSerializedNode(node);
      }) as BlockContainerNode[]) || [];

    const container = $createBlockHighlightNode(
      serializedNode.properties,
      quoteDecorator,
      containerNodes,
    );
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
        highlightContextText: this.getHighlightContextText(),
        highlightContextPath: this.getHighlightContextPath(),
        highlightContextRect: this.getHighlightContextRect(),
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
  getHighlightRect(): HighlightRect {
    return this.getLatest().__highlightRect;
  }
  getHighlightContextText(): string | undefined {
    return this.getLatest().__highlightContextText;
  }
  getHighlightContextPath(): string | undefined {
    return this.getLatest().__highlightContextPath;
  }
  getHighlightContextRect(): HighlightRect | undefined {
    return this.getLatest().__highlightContextRect;
  }
}

export function $createBlockHighlightNode(
  highlightProps: HighlightProps,
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
