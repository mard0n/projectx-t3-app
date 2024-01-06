import type {
  NodeKey,
  EditorConfig,
  DOMConversionMap,
  LexicalEditor,
  DOMExportOutput,
  DOMConversionOutput,
  ElementFormatType,
  LexicalNode,
  Spread,
} from "lexical";
import { BlockContainerNode } from "../HierarchicalBlockPlugin";
import { type SerializedBlockContainerNode } from "../HierarchicalBlockPlugin/BlockContainer";

export type SerializedHeaderNode = Spread<
  {
    tag: "h1" | "h2" | "h3" | "h4";
  },
  SerializedBlockContainerNode
>;

export type HeaderTagType = "h1" | "h2" | "h3" | "h4";

const HEADER_BLOCK_TYPE = "header";

/** @noInheritDoc */
export class HeaderNode extends BlockContainerNode {
  /** @internal */
  __tag: HeaderTagType;

  static getType(): string {
    return HEADER_BLOCK_TYPE;
  }

  static clone(node: HeaderNode): HeaderNode {
    return new HeaderNode({
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

  updateDOM(prevNode: HeaderNode, dom: HTMLDivElement): boolean {
    console.log("updateDOM");
    return super.updateDOM(prevNode, dom);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      h1: (node: Node) => ({
        conversion: convertHeaderElement,
        priority: 0,
      }),
      h2: (node: Node) => ({
        conversion: convertHeaderElement,
        priority: 0,
      }),
      h3: (node: Node) => ({
        conversion: convertHeaderElement,
        priority: 0,
      }),
      h4: (node: Node) => ({
        conversion: convertHeaderElement,
        priority: 0,
      }),
      // p: (node: Node) => {
      //   // domNode is a <p> since we matched it by nodeName
      //   // const paragraph = node as HTMLParagraphElement;
      //   // const firstChild = paragraph.firstChild;
      //   // if (firstChild !== null && isGoogleDocsTitle(firstChild)) {
      //   //   return {
      //   //     conversion: () => ({ node: null }),
      //   //     priority: 3,
      //   //   };
      //   // }
      //   return null;
      // },
      // span: (node: Node) => {
      //   // if (isGoogleDocsTitle(node)) {
      //   //   return {
      //   //     conversion: (domNode: Node) => {
      //   //       return {
      //   //         node: $createHeaderNode("h1"),
      //   //       };
      //   //     },
      //   //     priority: 3,
      //   //   };
      //   // }
      //   return null;
      // },
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);
    return {
      element,
    };
  }

  static importJSON(serializedNode: SerializedHeaderNode): HeaderNode {
    const container = super.importJSON(serializedNode);
    const headerNode = $createHeaderNode({ tag: serializedNode.tag });
    const containerChildren = container.getChildren();
    headerNode.append(...containerChildren);
    container.remove();
    return headerNode;
  }

  exportJSON(): SerializedHeaderNode {
    return {
      ...super.exportJSON(),
      tag: this.getTag(),
      type: HEADER_BLOCK_TYPE,
      version: 1,
    };
  }
}

function convertHeaderElement(element: HTMLElement): DOMConversionOutput {
  const nodeName = element.nodeName.toLowerCase();
  let node = null;
  if (
    nodeName === "h1" ||
    nodeName === "h2" ||
    nodeName === "h3" ||
    nodeName === "h4"
  ) {
    node = $createHeaderNode({ tag: nodeName });
    if (element.style !== null) {
      node.setFormat(element.style.textAlign as ElementFormatType);
    }
  }
  return { node };
}

export function $createHeaderNode({ tag }: { tag: HeaderTagType }): HeaderNode {
  return new HeaderNode({ tag });
}

export function $isHeaderNode(
  node: LexicalNode | null | undefined,
): node is HeaderNode {
  return node instanceof HeaderNode;
}
