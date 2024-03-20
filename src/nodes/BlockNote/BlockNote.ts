import {
  type NodeKey,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  ElementNode,
  type RootNode,
  $parseSerializedNode,
} from "lexical";
import { z } from "zod";
import { type BlockContainerNode } from "../Block";
import { SerializedElementNodeSchema } from "~/utils/lexical";
import { type Prettify } from "~/utils/types";
import type { CustomTheme } from "~/utils/lexical/theme";
import { addClassNamesToElement } from "@lexical/utils";

export const BLOCK_NOTE_TYPE = "block-note" as const;

const BaseNoteNodeSchema = SerializedElementNodeSchema.extend({
  type: z.literal(BLOCK_NOTE_TYPE),
  id: z.string(),
  indexWithinParent: z.number(),
  version: z.number()
});

export type SerializedBlockNoteNode = Prettify<
  z.infer<typeof BaseNoteNodeSchema> & {
    childBlocks?: SerializedBlockNoteNode[];
  }
>;

const _SerializedBlockNoteNodeSchema: z.ZodType<SerializedBlockNoteNode> =
  BaseNoteNodeSchema.extend({
    childBlocks: z.lazy(() => SerializedBlockNoteNodeSchema.array().optional()),
  });

export const SerializedBlockNoteNodeSchema = BaseNoteNodeSchema.extend({
  childBlocks: z.lazy(() => _SerializedBlockNoteNodeSchema.array().optional()),
});

export class BlockNoteNode extends ElementNode {
  __id: string;
  __selected: boolean;

  constructor({
    key,
    id,
    selected,
  }: {
    selected?: boolean;
    key?: NodeKey;
    id?: string;
  } = {}) {
    super(key);
    this.__id = id ?? crypto.randomUUID();
    this.__selected = selected ?? false;
  }

  static clone(node: BlockNoteNode): BlockNoteNode {
    return new BlockNoteNode({
      key: node.__key,
      id: node.__id,
      selected: node.__selected,
    });
  }

  static getType(): string {
    return BLOCK_NOTE_TYPE;
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement("div");
    const theme = config.theme as CustomTheme;
    const className = theme.note;
    if (className !== undefined) {
      addClassNamesToElement(dom, className);
    }

    if (this.__selected) {
      dom.classList.add("selected");
    } else {
      dom.classList.remove("selected");
    }

    return dom;
  }

  updateDOM(prevNode: BlockNoteNode, dom: HTMLDivElement): boolean {
    if (prevNode.__selected !== this.__selected) {
      if (this.__selected) {
        dom.classList.add("selected");
      } else {
        dom.classList.remove("selected");
      }
    }
    return false;
  }

  static importJSON(serializedNode: SerializedBlockNoteNode): BlockNoteNode {
    const containerNode = $createBlockNoteNode();

    const containerNodes =
      (serializedNode.childBlocks?.map((node) => {
        return $parseSerializedNode(node);
      }) as BlockContainerNode[]) || [];
    containerNode.append(...containerNodes);

    containerNode.append(...containerNodes);
    containerNode.setId(serializedNode.id);
    return containerNode;
  }

  exportJSON(): SerializedBlockNoteNode {
    return {
      ...super.exportJSON(),
      indexWithinParent: this.getIndexWithinParent(),
      type: BLOCK_NOTE_TYPE,
      id: this.getId(),
      version: 1,
    };
  }

  getChildren<T extends LexicalNode = BlockContainerNode>(): Array<T> {
    return super.getChildren();
  }

  getParent<T extends ElementNode = RootNode>(): T | null {
    return super.getParent();
  }

  getId(): string {
    return this.getLatest().__id;
  }

  setId(id: string) {
    this.getWritable().__id = id;
  }

  getSelected(): boolean {
    return this.getLatest().__selected;
  }

  setSelected(selected: boolean) {
    this.getWritable().__selected = selected;
  }
}

export function $createBlockNoteNode(): BlockNoteNode {
  const container = new BlockNoteNode();
  return container;
}

export function $isBlockNoteNode(
  node: LexicalNode | null | undefined,
): node is BlockNoteNode {
  return node instanceof BlockNoteNode;
}
