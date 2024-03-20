import {
  type NodeKey,
  type EditorConfig,
  type LexicalNode,
  type LexicalEditor,
  type SerializedTextNode,
  type TextNode,
  type LineBreakNode,
  $parseSerializedNode,
} from "lexical";
import { z } from "zod";
import {
  $createBlockChildContainerNode,
  BlockContainerNode,
  SerializedBlockContainerNodeSchema,
} from "../Block";
import { $createBlockTextContentNode } from "./BlockTextContent";
import { type CustomTheme } from "~/utils/lexical/theme";
import { addClassNamesToElement } from "@lexical/utils";

export const BLOCK_TEXT_TYPE = "block-text" as const;

const BlockTextTagTypeSchema = z.enum(["h1", "h2", "h3", "p"]);
export type BlockTextTagType = z.infer<typeof BlockTextTagTypeSchema>;

export const SerializedBlockTextNodeSchema =
  SerializedBlockContainerNodeSchema.extend({
    type: z.literal(BLOCK_TEXT_TYPE),
    properties: z.object({
      tag: BlockTextTagTypeSchema,
      content: z.string(),
    }),
  });

export type SerializedBlockTextNode = z.infer<
  typeof SerializedBlockTextNodeSchema
>;

export class BlockTextNode extends BlockContainerNode {
  __tag: BlockTextTagType;

  constructor({
    tag,
    open,
    key,
    id,
    selected,
  }: {
    tag: BlockTextTagType;
    open?: boolean;
    selected?: boolean;
    key?: NodeKey;
    id?: string;
  }) {
    super({ key, open, id, selected });
    this.__tag = tag;
  }

  static clone(node: BlockTextNode): BlockTextNode {
    return new BlockTextNode({
      tag: node.__tag,
      key: node.__key,
      open: node.__open,
      id: node.__id,
      selected: node.__selected,
    });
  }

  static getType(): string {
    return BLOCK_TEXT_TYPE;
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = super.createDOM(config, editor);
    const tag = this.__tag;
    const theme = config.theme as CustomTheme;
    const blockTextClassNames = theme.blockText;
    if (blockTextClassNames) {
      const tagName = blockTextClassNames[tag];
      const blockContainer = blockTextClassNames.container;
      addClassNamesToElement(dom, blockContainer, tagName);
    }
    return dom;
  }

  updateDOM(prevNode: BlockTextNode, dom: HTMLDivElement): boolean {
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(serializedNode: SerializedBlockTextNode): BlockTextNode {
    const contentText = JSON.parse(
      serializedNode.properties.content,
    ) as SerializedTextNode[];
    const contentChildren = contentText.map((node) =>
      $parseSerializedNode(node),
    ) as (TextNode | LineBreakNode)[]; // TODO: put a propper guard

    const containerNodes =
      (serializedNode.childBlocks?.map((node) => {
        return $parseSerializedNode(node);
      }) as BlockContainerNode[]) || [];

    const container = $createBlockTextNode(
      serializedNode.properties.tag,
      contentChildren,
      containerNodes,
    );
    container.setId(serializedNode.id);
    container.setOpen(serializedNode.open);
    container.setWebUrl(serializedNode.webUrl);
    return container;
  }

  exportJSON(): SerializedBlockTextNode {
    const contentNode = this.getBlockContentNode();
    const content = JSON.stringify(
      contentNode.getChildren().map((node) => node.exportJSON()),
    );

    return {
      ...super.exportJSON(),
      type: BLOCK_TEXT_TYPE,
      version: 1,
      properties: {
        tag: this.getTag(),
        content: content,
      },
    };
  }

  getTag(): BlockTextTagType {
    return this.__tag;
  }
}

export function $createBlockTextNode(
  tag: BlockTextTagType,
  contentChildren?: (TextNode | LineBreakNode)[],
  childBlocks?: BlockContainerNode[],
): BlockTextNode {
  const container = new BlockTextNode({ tag });
  const content = $createBlockTextContentNode(tag);
  const childContainer = $createBlockChildContainerNode();

  if (contentChildren?.length) {
    content.append(...contentChildren);
  }

  if (childBlocks?.length) {
    childContainer.append(...childBlocks);
  }

  container.append(content, childContainer);
  return container;
}

export function $isBlockTextNode(
  node: LexicalNode | null | undefined,
): node is BlockTextNode {
  return node instanceof BlockTextNode;
}
