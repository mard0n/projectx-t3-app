import type {
  NodeKey,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  Spread,
} from "lexical";
import {
  BlockContainerNode,
  type SerializedBlockContainerNode,
} from "../Block";
import { z } from "zod";
import { SerializedElementNodeSchema } from "~/utils/lexical";
import type { Prettify } from "~/utils/types";
import { addClassNamesToElement } from "@lexical/utils";

export const SerializedBlockHeaderNodeSchema: z.ZodType<SerializedBlockHeaderNode> =
  z
    .object({
      id: z.string(),
      open: z.boolean(),
      title: z.string(),
      childNotes: z.lazy(() => z.array(SerializedBlockHeaderNodeSchema)),
      parentId: z.string().nullable(),
      indexWithinParent: z.number(),
      tag: z.union([
        z.literal("h1"),
        z.literal("h2"),
        z.literal("h3"),
        z.literal("h4"),
      ]),
    })
    .merge(SerializedElementNodeSchema);

export type SerializedBlockHeaderNode = Prettify<
  Spread<
    {
      tag: "h1" | "h2" | "h3" | "h4";
    },
    SerializedBlockContainerNode
  >
>;

export type HeaderTagType = "h1" | "h2" | "h3" | "h4";

const HEADER_BLOCK_TYPE = "header";

/** @noInheritDoc */
export class BlockHeaderNode extends BlockContainerNode {
  /** @internal */
  __tag: HeaderTagType;

  constructor({
    tag,
    key,
    open,
    id,
    selected,
  }: {
    tag: HeaderTagType;
    key?: NodeKey;
    open?: boolean;
    id?: string;
    selected?: boolean;
  }) {
    super({ open, selected, id, key });
    this.__tag = tag;
  }

  static clone(node: BlockHeaderNode): BlockHeaderNode {
    return new BlockHeaderNode({
      tag: node.__tag,
      key: node.__key,
      open: node.__open,
      id: node.__id,
      selected: node.__selected,
    });
  }

  static getType(): string {
    return HEADER_BLOCK_TYPE;
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = super.createDOM(config, editor);
    const tag = this.__tag;
    const theme = config.theme;
    const classNames = theme.header as Record<string, string>;
    if (classNames !== undefined) {
      const className = classNames[tag];
      addClassNamesToElement(dom, className);
    }
    return dom;
  }

  updateDOM(prevNode: BlockHeaderNode, dom: HTMLDivElement): boolean {
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(
    serializedNode: SerializedBlockHeaderNode,
  ): BlockHeaderNode {
    const container = super.importJSON(serializedNode);
    const blockheaderNode = $createBlockHeaderNode({ tag: serializedNode.tag });
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

  exportJSON(): SerializedBlockHeaderNode {
    return {
      ...super.exportJSON(),
      tag: this.getTag(),
      type: HEADER_BLOCK_TYPE,
      version: 1,
    };
  }

  getTag(): HeaderTagType {
    return this.__tag;
  }
}

export function $createBlockHeaderNode({
  tag,
}: {
  tag: HeaderTagType;
}): BlockHeaderNode {
  return new BlockHeaderNode({ tag });
}

export function $isBlockHeaderNode(
  node: LexicalNode | null | undefined,
): node is BlockHeaderNode {
  return node instanceof BlockHeaderNode;
}
