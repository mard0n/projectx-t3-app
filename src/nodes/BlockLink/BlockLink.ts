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
  $createBlockContentNode,
  BlockContainerNode,
  SerializedBlockContainerNodeSchema,
} from "../Block";
import { type CustomTheme } from "~/utils/lexical/theme";
import { addClassNamesToElement } from "@lexical/utils";
import { $createBlockLinkDecoratorNode } from ".";

export const BLOCK_LINK_TYPE = "block-link" as const;

export const SerializedBlockLinkNodeSchema =
  SerializedBlockContainerNodeSchema.extend({
    type: z.literal(BLOCK_LINK_TYPE),
    properties: z.object({
      linkType: z.union([
        z.literal("block-link-bookmark"),
        z.literal("block-link-youtube"),
      ]),
      title: z.string(),
      desc: z.string().optional(),
      linkUrl: z.string().url(),
      linkAlt: z.string(),
      thumbnail: z.string().url().optional(),
      commentText: z.string(),
    }),
  });

export type SerializedBlockLinkNode = z.infer<
  typeof SerializedBlockLinkNodeSchema
>;

type BlockLinkProps = z.infer<
  typeof SerializedBlockLinkNodeSchema.shape.properties
>;

type LinkType = "block-link-bookmark" | "block-link-youtube";

export class BlockLinkNode extends BlockContainerNode {
  __linkType: LinkType;
  __title: string;
  __desc?: string;
  __linkUrl: string;
  __linkAlt: string;
  __thumbnail?: string;
  __commentText: string;

  constructor({
    linkType,
    title,
    desc,
    linkUrl,
    linkAlt,
    thumbnail,
    commentText,
    key,
    id,
    open,
    selected,
  }: {
    linkType: LinkType;
    title: string;
    desc?: string;
    linkUrl: string;
    linkAlt: string;
    thumbnail?: string;
    commentText: string;
    key?: NodeKey;
    id?: string;
    open?: boolean;
    selected?: boolean;
  }) {
    super({ key, open, id, selected });
    this.__linkType = linkType;
    this.__title = title;
    this.__desc = desc;
    this.__linkUrl = linkUrl;
    this.__linkAlt = linkAlt;
    this.__thumbnail = thumbnail;
    this.__commentText = commentText;
  }

  static clone(node: BlockLinkNode): BlockLinkNode {
    return new BlockLinkNode({
      key: node.__key,
      open: node.__open,
      id: node.__id,
      selected: node.__selected,
      linkType: node.__linkType,
      title: node.__title,
      desc: node.__desc,
      linkUrl: node.__linkUrl,
      linkAlt: node.__linkAlt,
      thumbnail: node.__thumbnail,
      commentText: node.__commentText,
    });
  }

  static getType(): string {
    return BLOCK_LINK_TYPE;
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = super.createDOM(config, editor);
    const theme = config.theme as CustomTheme;
    const blockTextClassNames = theme.blockLink;
    if (blockTextClassNames) {
      const blockContainer = blockTextClassNames.container;
      addClassNamesToElement(dom, blockContainer);
    }
    return dom;
  }

  updateDOM(prevNode: BlockLinkNode, dom: HTMLDivElement): boolean {
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(serializedNode: SerializedBlockLinkNode): BlockLinkNode {
    const contentDecorator = $createBlockLinkDecoratorNode({
      title: serializedNode.properties.title,
      desc: serializedNode.properties.desc,
      linkUrl: serializedNode.properties.linkUrl,
      linkAlt: serializedNode.properties.linkAlt,
      thumbnail: serializedNode.properties.thumbnail,
      commentText: serializedNode.properties.commentText,
    });

    const content = $createBlockContentNode().append(contentDecorator);

    const containerNodes =
      (serializedNode.childBlocks?.map((node) => {
        return $parseSerializedNode(node);
      }) as BlockContainerNode[]) || [];

    const childContainer = $createBlockChildContainerNode().append(
      ...containerNodes,
    );

    const container = $createBlockLinkNode({
      linkType: serializedNode.properties.linkType,
      title: serializedNode.properties.title,
      desc: serializedNode.properties.desc,
      linkUrl: serializedNode.properties.linkUrl,
      linkAlt: serializedNode.properties.linkAlt,
      thumbnail: serializedNode.properties.thumbnail,
      commentText: serializedNode.properties.commentText,
    });

    container.append(content, childContainer);
    return container;
  }

  exportJSON(): SerializedBlockLinkNode {
    return {
      ...super.exportJSON(),
      type: BLOCK_LINK_TYPE,
      version: 1,
      properties: {
        linkType: this.getLinkType(),
        title: this.getTitle(),
        desc: this.getDesc(),
        linkUrl: this.getLinkUrl(),
        linkAlt: this.getLinkAlt(),
        thumbnail: this.getThumbnail(),
        commentText: this.getCommentText(),
      },
    };
  }

  getId(): string {
    return this.getLatest().__id;
  }

  getLinkType(): LinkType {
    return this.getLatest().__linkType;
  }
  getTitle(): string {
    return this.getLatest().__title;
  }
  getDesc(): string | undefined {
    return this.getLatest().__desc;
  }
  getLinkUrl(): string {
    return this.getLatest().__linkUrl;
  }
  getLinkAlt(): string {
    return this.getLatest().__linkAlt;
  }
  getThumbnail(): string | undefined {
    return this.getLatest().__thumbnail;
  }
  getCommentText(): string {
    return this.getLatest().__commentText;
  }
}

export function $createBlockLinkNode(
  blockLinkProps: BlockLinkProps,
): BlockLinkNode {
  const container = new BlockLinkNode({ ...blockLinkProps });
  return container;
}

export function $isBlockLinkNode(
  node: LexicalNode | null | undefined,
): node is BlockLinkNode {
  return node instanceof BlockLinkNode;
}
