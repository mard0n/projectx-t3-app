import { addClassNamesToElement } from "@lexical/utils";
import { type NodeKey, type Spread, type LexicalNode, type EditorConfig } from "lexical";
import type { CustomTheme } from "~/utils/lexical/theme";
import { BlockContentNode, type SerializedContentNode } from "../Block";

export type SerializedBlockRemarkContentNode = Spread<
  object,
  SerializedContentNode
>;

const BLOCK_REMARK_CONTENT_TYPE = "block-remark-content" as const;


export class BlockRemarkContentNode extends BlockContentNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return BLOCK_REMARK_CONTENT_TYPE;
  }

  static clone(node: BlockRemarkContentNode): BlockRemarkContentNode {
    return new BlockRemarkContentNode(node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const parentDom = super.createDOM(config);
    const parentClassName = parentDom.className;

    const dom = document.createElement("div");
    const theme = config.theme as CustomTheme;
    const classNames = theme.blockHighlight.content;
    if (classNames && parentClassName) {
      addClassNamesToElement(dom, parentClassName);
    }
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(): BlockRemarkContentNode {
    const node = $createBlockRemarkContentNode();
    return node;
  }

  exportJSON(): SerializedBlockRemarkContentNode {
    return {
      ...super.exportJSON(),
      type: BLOCK_REMARK_CONTENT_TYPE,
      version: 1,
    };
  }
}

export function $createBlockRemarkContentNode(): BlockRemarkContentNode {
  return new BlockRemarkContentNode();
}

export function $isBlockRemarkContentNode(
  node: LexicalNode | null | undefined,
): node is BlockRemarkContentNode {
  return node instanceof BlockRemarkContentNode;
}
