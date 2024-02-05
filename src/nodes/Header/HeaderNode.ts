import { addClassNamesToElement } from "@lexical/utils";
import { ElementNode, isHTMLElement, $createParagraphNode } from "lexical";
import type {
  NodeKey,
  EditorConfig,
  DOMConversionMap,
  LexicalEditor,
  DOMExportOutput,
  RangeSelection,
  ParagraphNode,
  DOMConversionOutput,
  ElementFormatType,
  LexicalNode,
  SerializedElementNode,
  Spread,
} from "lexical";
import type { CustomTheme } from "~/utils/lexical/theme";

export type SerializedHeaderNode = Spread<
  {
    tag: "h1" | "h2" | "h3" | "h4";
  },
  SerializedElementNode
>;

const HEADER_TYPE = "Header" as const;

export type HeaderTagType = "h1" | "h2" | "h3" | "h4";

/** @noInheritDoc */
export class HeaderNode extends ElementNode {
  /** @internal */
  __tag: HeaderTagType;

  static getType(): string {
    return HEADER_TYPE;
  }

  static clone(node: HeaderNode): HeaderNode {
    return new HeaderNode(node.__tag, node.__key);
  }

  constructor(tag: HeaderTagType, key?: NodeKey) {
    super(key);
    this.__tag = tag;
  }

  getTag(): HeaderTagType {
    return this.__tag;
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const tag = this.__tag;
    const element = document.createElement(tag);
    const theme = config.theme as CustomTheme;
    const classNames = theme.header;
    if (classNames !== undefined) {
      const className = classNames[tag];
      addClassNamesToElement(element, className);
    }
    return element;
  }

  updateDOM(prevNode: HeaderNode, dom: HTMLElement): boolean {
    return false;
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
      h5: (node: Node) => ({
        conversion: convertHeaderElement,
        priority: 0,
      }),
      h6: (node: Node) => ({
        conversion: convertHeaderElement,
        priority: 0,
      }),
      p: (node: Node) => {
        // // domNode is a <p> since we matched it by nodeName
        // const paragraph = node as HTMLParagraphElement;
        // const firstChild = paragraph.firstChild;
        // if (firstChild !== null && isGoogleDocsTitle(firstChild)) {
        //   return {
        //     conversion: () => ({ node: null }),
        //     priority: 3,
        //   };
        // }
        return null;
      },
      span: (node: Node) => {
        // if (isGoogleDocsTitle(node)) {
        //   return {
        //     conversion: (domNode: Node) => {
        //       return {
        //         node: $createHeaderNode("h1"),
        //       };
        //     },
        //     priority: 3,
        //   };
        // }
        return null;
      },
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);

    if (element && isHTMLElement(element)) {
      if (this.isEmpty()) element.append(document.createElement("br"));

      const formatType = this.getFormatType();
      element.style.textAlign = formatType;

      const direction = this.getDirection();
      if (direction) {
        element.dir = direction;
      }
    }

    return {
      element,
    };
  }

  static importJSON(serializedNode: SerializedHeaderNode): HeaderNode {
    const node = $createHeaderNode(serializedNode.tag);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedHeaderNode {
    return {
      ...super.exportJSON(),
      tag: this.getTag(),
      type: HEADER_TYPE,
      version: 1,
    };
  }

  // Mutation
  insertNewAfter(
    selection?: RangeSelection,
    restoreSelection = true,
  ): ParagraphNode | HeaderNode {
    const anchorOffet = selection ? selection.anchor.offset : 0;
    const newElement =
      anchorOffet === this.getTextContentSize() || !selection
        ? $createParagraphNode()
        : $createHeaderNode(this.getTag());
    const direction = this.getDirection();
    newElement.setDirection(direction);
    this.insertAfter(newElement, restoreSelection);
    if (anchorOffet === 0 && !this.isEmpty() && selection) {
      // TODO: Figure out if it's a right decision.
      // Because when you press enter at the beginning of the line it leaves empty paragraph at the place where
      // the Header was and we don't need that
      this.remove();
      // this.replace($createParagraphNode(), restoreSelection);
    }
    return newElement;
  }

  collapseAtStart(): true {
    const newElement = !this.isEmpty()
      ? $createHeaderNode(this.getTag())
      : $createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => newElement.append(child));
    this.replace(newElement);
    return true;
  }

  extractWithChild(): boolean {
    return true;
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
    node = $createHeaderNode(nodeName);
    if (element.style !== null) {
      node.setFormat(element.style.textAlign as ElementFormatType);
    }
  }
  return { node };
}

export function $createHeaderNode(headerTag: HeaderTagType): HeaderNode {
  return new HeaderNode(headerTag);
}

export function $isHeaderNode(
  node: LexicalNode | null | undefined,
): node is HeaderNode {
  return node instanceof HeaderNode;
}
