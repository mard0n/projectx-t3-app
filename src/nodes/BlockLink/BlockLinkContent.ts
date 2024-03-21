import { addClassNamesToElement } from "@lexical/utils";
import { type NodeKey, type Spread, type LexicalNode, type EditorConfig } from "lexical";
import type { CustomTheme } from "~/utils/lexical/theme";
import { BlockContentNode, type SerializedContentNode } from "../Block";

export type SerializedBlockLinkContentNode = Spread<
  object,
  SerializedContentNode
>;

const BLOCK_LINK_CONTENT_TYPE = "block-link-content" as const;


export class BlockLinkContentNode extends BlockContentNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return BLOCK_LINK_CONTENT_TYPE;
  }

  static clone(node: BlockLinkContentNode): BlockLinkContentNode {
    return new BlockLinkContentNode(node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const parentDom = super.createDOM(config);
    const parentClassName = parentDom.className;

    const dom = document.createElement("div");
    const theme = config.theme as CustomTheme;
    const classNames = theme.blockLink.content;
    if (classNames && parentClassName) {
      addClassNamesToElement(dom, parentClassName);
    }
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(): BlockLinkContentNode {
    const node = $createBlockLinkContentNode();
    return node;
  }

  exportJSON(): SerializedBlockLinkContentNode {
    return {
      ...super.exportJSON(),
      type: BLOCK_LINK_CONTENT_TYPE,
      version: 1,
    };
  }
}

export function $createBlockLinkContentNode(): BlockLinkContentNode {
  return new BlockLinkContentNode();
}

export function $isBlockLinkContentNode(
  node: LexicalNode | null | undefined,
): node is BlockLinkContentNode {
  return node instanceof BlockLinkContentNode;
}
