import {
  type NodeKey,
  type EditorConfig,
  type LexicalNode,
  type LexicalEditor,
  $parseSerializedNode,
  $createTextNode,
} from "lexical";
import { z } from "zod";
import {
  $createBlockChildContainerNode,
  BlockContainerNode,
  SerializedBlockContainerNodeSchema,
} from "../Block";
import { type CustomTheme } from "~/utils/lexical/theme";
import { addClassNamesToElement } from "@lexical/utils";
import { RectSchema, type RectType } from "~/utils/extension/highlight";
import { $createBlockRemarkContentNode } from ".";

export const BLOCK_REMARK_TYPE = "block-remark" as const;

export const SerializedBlockRemarkNodeSchema =
  SerializedBlockContainerNodeSchema.extend({
    type: z.literal(BLOCK_REMARK_TYPE),
    properties: z.object({
      remarkText: z.string(),
      remarkRect: RectSchema,
    }),
  });

export type SerializedBlockRemarkNode = z.infer<
  typeof SerializedBlockRemarkNodeSchema
>;

export class BlockRemarkNode extends BlockContainerNode {
  __remarkText: string;
  __remarkRect: RectType;

  constructor({
    open,
    key,
    id,
    selected,
    remarkText,
    remarkRect,
  }: {
    remarkText: string;
    remarkRect: RectType;
    open?: boolean;
    selected?: boolean;
    key?: NodeKey;
    id?: string;
  }) {
    super({ key, open, id, selected });
    this.__remarkText = remarkText;
    this.__remarkRect = remarkRect;
  }

  static clone(node: BlockRemarkNode): BlockRemarkNode {
    return new BlockRemarkNode({
      key: node.__key,
      open: node.__open,
      id: node.__id,
      selected: node.__selected,
      remarkText: node.__remarkText,
      remarkRect: node.__remarkRect,
    });
  }

  static getType(): string {
    return BLOCK_REMARK_TYPE;
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = super.createDOM(config, editor);
    const theme = config.theme as CustomTheme;
    const blockTextClassNames = theme.blockRemark;
    if (blockTextClassNames) {
      const blockContainer = blockTextClassNames.container;
      addClassNamesToElement(dom, blockContainer);
    }
    return dom;
  }

  updateDOM(prevNode: BlockRemarkNode, dom: HTMLDivElement): boolean {
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(
    serializedNode: SerializedBlockRemarkNode,
  ): BlockRemarkNode {
    const container = $createBlockRemarkNode(
      serializedNode.properties.remarkText,
      serializedNode.properties.remarkRect,
    );

    const textNode = $createTextNode(serializedNode.properties.remarkText);
    const contentNode = $createBlockRemarkContentNode().append(textNode);

    const childContainerNodes =
      (serializedNode.childBlocks?.map((node) => {
        return $parseSerializedNode(node);
      }) as BlockContainerNode[]) || [];

    const childContainerNode = $createBlockChildContainerNode().append(
      ...childContainerNodes,
    );

    container.append(contentNode, childContainerNode);
    container.setId(serializedNode.id);
    container.setOpen(serializedNode.open);
    container.setWebUrl(serializedNode.webUrl);
    return container;
  }

  exportJSON(): SerializedBlockRemarkNode {
    return {
      ...super.exportJSON(),
      type: BLOCK_REMARK_TYPE,
      version: 1,
      properties: {
        remarkText: this.getRemarkText(),
        remarkRect: this.getRemarkRect(),
      },
    };
  }

  getId(): string {
    return this.getLatest().__id;
  }

  getRemarkText(): string {
    return this.getLatest().__remarkText;
  }
  getRemarkRect(): RectType {
    return this.getLatest().__remarkRect;
  }
}

export function $createBlockRemarkNode(
  remarkText: string,
  remarkRect: RectType,
): BlockRemarkNode {
  const container = new BlockRemarkNode({ remarkText, remarkRect });
  return container;
}

export function $isBlockRemarkNode(
  node: LexicalNode | null | undefined,
): node is BlockRemarkNode {
  return node instanceof BlockRemarkNode;
}
