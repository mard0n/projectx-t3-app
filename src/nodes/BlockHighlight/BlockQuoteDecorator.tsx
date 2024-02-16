import { useEffect, type ReactNode } from "react";
import {
  DecoratorNode,
  type Spread,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  type EditorConfig,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { addClassNamesToElement, mergeRegister } from "@lexical/utils";
import Markdown from "react-markdown";
import type { CustomTheme } from "~/utils/lexical/theme";

export type SerializedBlockQuoteDecoratorNode = Spread<
  {
    highlightedParagraph: string;
    highlightedText: string;
  },
  SerializedLexicalNode
>;

function BlockQuoteComponent({
  highlightedParagraph,
  highlightedText,
}: {
  highlightedParagraph: string;
  highlightedText: string;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  // useEffect(() => {
  //   const pbElem = editor.getElementByKey(nodeKey);
  //   if (pbElem !== null) {
  //     pbElem.className = isSelected ? 'selected' : '';
  //   }
  // }, [editor, isSelected, nodeKey]);

  return <Markdown>{highlightedText}</Markdown>;
}

export class BlockQuoteDecorator extends DecoratorNode<ReactNode> {
  __highlightedParagraph: string;
  __highlightedText: string;

  constructor(
    highlightedParagraph: string,
    highlightedText: string,
    key?: NodeKey,
  ) {
    super(key);
    this.__highlightedParagraph = highlightedParagraph;
    this.__highlightedText = highlightedText;
  }

  static getType(): string {
    return "block-quote-decorator";
  }

  static clone(node: BlockQuoteDecorator): BlockQuoteDecorator {
    return new BlockQuoteDecorator(
      node.__highlightedParagraph,
      node.__highlightedText,
      node.__key,
    );
  }

  static importJSON(
    serializedNode: SerializedBlockQuoteDecoratorNode,
  ): BlockQuoteDecorator {
    const node = $createBlockQuoteDecoratorNode(
      serializedNode.highlightedParagraph,
      serializedNode.highlightedText,
    );
    return node;
  }

  exportJSON(): SerializedBlockQuoteDecoratorNode {
    return {
      ...super.exportJSON(),
      highlightedParagraph: this.getHighlightedParagraph() ?? "",
      highlightedText: this.getHighlightedText() ?? "",
      version: 1,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    const theme = config.theme as CustomTheme;
    const className = theme.block.content;
    const classNameHighlight = theme.blockHighlight.content;
    if (className !== undefined) {
      addClassNamesToElement(dom, className, classNameHighlight);
    }
    dom.style.whiteSpace = "normal";
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  getHighlightedParagraph() {
    return this.getLatest().__highlightedParagraph;
  }

  setHighlightedParagraph(highlightedParagraph: string) {
    this.getWritable().__highlightedParagraph = highlightedParagraph;
  }

  getHighlightedText() {
    return this.getLatest().__highlightedText;
  }

  setHighlightedText(highlightedText: string) {
    this.getWritable().__highlightedText = highlightedText;
  }

  decorate(): ReactNode {
    return (
      <BlockQuoteComponent
        highlightedText={this.__highlightedText}
        highlightedParagraph={this.__highlightedParagraph}
      />
    );
  }
}

export function $createBlockQuoteDecoratorNode(
  highlightedParagraph: string,
  highlightedText: string,
): BlockQuoteDecorator {
  return new BlockQuoteDecorator(highlightedParagraph, highlightedText);
}

export function $isBlockQuoteDecoratorNode(
  node: LexicalNode | null | undefined,
): node is BlockQuoteDecorator {
  return node instanceof BlockQuoteDecorator;
}
