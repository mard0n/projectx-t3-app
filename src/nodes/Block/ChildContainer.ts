import { addClassNamesToElement } from "@lexical/utils";
import { type BlockContainerNode } from ".";
import type {
  SerializedElementNode,
  NodeKey,
  LexicalNode,
  TextNode,
  Spread,
  EditorConfig,
  DOMExportOutput,
  LexicalEditor,
} from "lexical";
import { ElementNode } from "lexical";
import { type CustomTheme } from "~/utils/lexical/theme";

type SerializedBlockChildContainerNode = Spread<object, SerializedElementNode>;

const CHILD_CONTAINER_TYPE = "block-child-container" as const;

export class BlockChildContainerNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return CHILD_CONTAINER_TYPE;
  }

  static clone(node: BlockChildContainerNode): BlockChildContainerNode {
    return new BlockChildContainerNode(node.__key);
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    const theme = config.theme as CustomTheme;
    addClassNamesToElement(dom, theme.block.childContainer);

    const children = this.getChildren();
    if (!children.length) {
      dom.style.display = "none";
    }

    return dom;
  }
  updateDOM(prevNode: TextNode, dom: HTMLElement): boolean {
    const children = this.getChildren();
    if (!children.length) {
      dom.style.display = "none";
    } else {
      dom.style.removeProperty("display");
    }
    return false;
  }

  static importJSON(): BlockChildContainerNode {
    const node = $createBlockChildContainerNode();
    return node;
  }

  exportJSON(): SerializedBlockChildContainerNode {
    return {
      ...super.exportJSON(),
      type: CHILD_CONTAINER_TYPE,
      version: 1,
    };
  }

  // static importDOM(): DOMConversionMap<HTMLDivElement> | null {
  //   return {
  //     div: (domNode: HTMLDivElement) => {
  //       if (!domNode.classList.contains(customTheme.block.childContainer)) {
  //         return null;
  //       }
  //       return {
  //         conversion: (element: HTMLElement): DOMConversionOutput => {
  //           const node = $createBlockChildContainerNode();
  //           console.log("convertBlockContentNode node", node);
  //           return { node };
  //         },
  //         priority: 1,
  //       };
  //     },
  //   };
  // }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = this.createDOM(editor._config);
    console.log("BlockChildContainerNode exportDOM element", element);
    return { element };
  }

  // Mutation
  append(...nodesToAppend: BlockContainerNode[]): this {
    return super.append(...nodesToAppend);
  }

  getParent<T extends ElementNode = BlockContainerNode>(): T | null {
    return super.getParent();
  }

  getChildren<T extends LexicalNode = BlockContainerNode>(): T[] {
    return super.getChildren();
  }
}

export function $createBlockChildContainerNode(): BlockChildContainerNode {
  return new BlockChildContainerNode();
}

export function $isBlockChildContainerNode(
  node: LexicalNode | null | undefined,
): node is BlockChildContainerNode {
  return node instanceof BlockChildContainerNode;
}
