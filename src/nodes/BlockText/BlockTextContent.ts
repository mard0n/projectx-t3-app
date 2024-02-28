import { addClassNamesToElement } from "@lexical/utils";
import type { NodeKey, Spread, LexicalNode, EditorConfig } from "lexical";
import type { CustomTheme } from "~/utils/lexical/theme";
import { BlockContentNode, type SerializedContentNode } from "../Block";
import { type BlockTextTagType } from ".";

export type SerializedBlockTextContentNode = Spread<
  { tag: BlockTextTagType },
  SerializedContentNode
>;

const BLOCK_HEADER_CONTENT_TYPE = "block-text-content" as const;

export class BlockTextContentNode extends BlockContentNode {
  __tag: BlockTextTagType;

  constructor(tag: BlockTextTagType, key?: NodeKey) {
    super(key);
    this.__tag = tag;
  }

  static getType(): string {
    return BLOCK_HEADER_CONTENT_TYPE;
  }

  static clone(node: BlockTextContentNode): BlockTextContentNode {
    return new BlockTextContentNode(node.__tag, node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const parentDom = super.createDOM(config);
    const parentClassName = parentDom.className;

    const tag = this.__tag;
    const dom = document.createElement(tag);
    const theme = config.theme as CustomTheme;
    const classNames = theme.blockText.content;
    if (classNames && parentClassName) {
      addClassNamesToElement(dom, parentClassName);
    }
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(
    serializedNode: SerializedBlockTextContentNode,
  ): BlockTextContentNode {
    const node = $createBlockTextContentNode(serializedNode.tag);
    return node;
  }

  exportJSON(): SerializedBlockTextContentNode {
    return {
      ...super.exportJSON(),
      tag: this.getTag(),
      type: BLOCK_HEADER_CONTENT_TYPE,
      version: 1,
    };
  }

  getTag(): BlockTextTagType {
    return this.__tag;
  }
}

export function $createBlockTextContentNode(
  tag: BlockTextTagType,
): BlockTextContentNode {
  return new BlockTextContentNode(tag);
}

export function $isBlockTextContentNode(
  node: LexicalNode | null | undefined,
): node is BlockTextContentNode {
  return node instanceof BlockTextContentNode;
}
