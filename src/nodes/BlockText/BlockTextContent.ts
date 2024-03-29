import { addClassNamesToElement } from "@lexical/utils";
import type {
  NodeKey,
  Spread,
  LexicalNode,
  EditorConfig,
  DOMExportOutput,
  LexicalEditor,
} from "lexical";
import { type CustomTheme } from "~/utils/lexical/theme";
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

    const tag = this.__tag;
    const dom = document.createElement(tag);
    const theme = config.theme as CustomTheme;
    addClassNamesToElement(dom, parentDom.className, theme.blockText.content);
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

  // static importDOM(): DOMConversionMap<HTMLDivElement> | null {
  //   return {
  //     h1: (domNode: HTMLDivElement) => {
  //       if (!domNode.classList.contains(customTheme.blockText.content)) {
  //         return null;
  //       }
  //       return {
  //         conversion: (element: HTMLElement): DOMConversionOutput => {
  //           const node = $createBlockTextContentNode("h1");
  //           return { node };
  //         },
  //         priority: 2,
  //       };
  //     },
  //     h2: (domNode: HTMLDivElement) => {
  //       if (!domNode.classList.contains(customTheme.blockText.content)) {
  //         return null;
  //       }
  //       return {
  //         conversion: (element: HTMLElement): DOMConversionOutput => {
  //           const node = $createBlockTextContentNode("h2");
  //           return { node };
  //         },
  //         priority: 2,
  //       };
  //     },
  //     h3: (domNode: HTMLDivElement) => {
  //       if (!domNode.classList.contains(customTheme.blockText.content)) {
  //         return null;
  //       }
  //       return {
  //         conversion: (element: HTMLElement): DOMConversionOutput => {
  //           const node = $createBlockTextContentNode("h3");
  //           return { node };
  //         },
  //         priority: 2,
  //       };
  //     },
  //     p: (domNode: HTMLDivElement) => {
  //       if (!domNode.classList.contains(customTheme.blockText.content)) {
  //         return null;
  //       }
  //       return {
  //         conversion: (element: HTMLElement): DOMConversionOutput => {
  //           const node = $createBlockTextContentNode("p");
  //           return { node };
  //         },
  //         priority: 2,
  //       };
  //     },
  //   };
  // }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);
    console.log("exportDOM element", element);
    return { element };
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
