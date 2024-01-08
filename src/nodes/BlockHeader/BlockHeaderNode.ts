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

  static getType(): string {
    return HEADER_BLOCK_TYPE;
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

  getTag(): HeaderTagType {
    return this.__tag;
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    console.log("createDOM");
    const dom = super.createDOM(config, editor);
    const classNames = {
      h1: "header_1",
      h2: "header_2",
      h3: "header_3",
      h4: "header_4",
    }; // TODO: Maybe move it to themes
    dom.classList.add(classNames[this.getTag()]);
    return dom;
  }

  updateDOM(prevNode: BlockHeaderNode, dom: HTMLDivElement): boolean {
    console.log("updateDOM");
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(
    serializedNode: SerializedBlockHeaderNode,
  ): BlockHeaderNode {
    const container = super.importJSON(serializedNode);
    const BlockheaderNode = $createBlockHeaderNode({ tag: serializedNode.tag });
    const containerChildren = container.getChildren();
    BlockheaderNode.append(...containerChildren);
    container.remove();
    return BlockheaderNode;
  }

  exportJSON(): SerializedBlockHeaderNode {
    return {
      ...super.exportJSON(),
      tag: this.getTag(),
      type: HEADER_BLOCK_TYPE,
      version: 1,
    };
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
