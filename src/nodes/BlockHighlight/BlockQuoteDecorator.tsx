import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { addClassNamesToElement, mergeRegister } from "@lexical/utils";
import {
  DecoratorNode,
  type NodeKey,
  type EditorConfig,
  type LexicalNode,
  type SerializedLexicalNode,
  type Spread,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
} from "lexical";
import { useEffect, type ReactNode } from "react";
import { type CustomTheme } from "~/utils/lexical/theme";
import Markdown from "react-markdown";

export type SerializedBlockQuoteDecoratorNode = Spread<
  {
    highlightText: string;
    highlightContext: string;
  },
  SerializedLexicalNode
>;

function BlockQuoteComponent({
  highlightText,
  highlightContext,
}: {
  highlightText: string;
  highlightContext?: string;
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

  // TODO: figure out why drizzle db:push fails when component exist
  return <Markdown>{highlightText}</Markdown>;
  // return null;
}

export class BlockQuoteDecoratorNode extends DecoratorNode<ReactNode> {
  __highlightText: string;
  __highlightContext: string | undefined;

  constructor(highlightText: string, highlightContext?: string, key?: NodeKey) {
    super(key);
    this.__highlightText = highlightText;
    this.__highlightContext = highlightContext;
  }

  static getType(): string {
    return "block-quote-decorator";
  }

  static clone(node: BlockQuoteDecoratorNode): BlockQuoteDecoratorNode {
    return new BlockQuoteDecoratorNode(
      node.__highlightText,
      node?.__highlightContext,
      node.__key,
    );
  }

  static importJSON(
    serializedNode: SerializedBlockQuoteDecoratorNode,
  ): BlockQuoteDecoratorNode {
    const node = $createBlockQuoteDecoratorNode(
      serializedNode.highlightText,
      serializedNode.highlightContext,
    );
    return node;
  }

  exportJSON(): SerializedBlockQuoteDecoratorNode {
    return {
      ...super.exportJSON(),
      highlightText: this.getHighlightedText() ?? "",
      highlightContext: this.getHighlightedParagraph() ?? "",
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
    return this.getLatest().__highlightContext;
  }

  setHighlightedParagraph(highlightContext: string) {
    this.getWritable().__highlightContext = highlightContext;
  }

  getHighlightedText() {
    return this.getLatest().__highlightText;
  }

  setHighlightedText(highlightText: string) {
    this.getWritable().__highlightText = highlightText;
  }

  // TODO: figure out why drizzle db:push fails when component exist
  decorate(): ReactNode {
    return (
      <BlockQuoteComponent
        highlightContext={this.__highlightContext}
        highlightText={this.__highlightText}
      />
    );
  }
  // decorate(): ReactNode {
  //   return null;
  // }
}

export function $createBlockQuoteDecoratorNode(
  highlightText: string,
  highlightContext: string | undefined,
): BlockQuoteDecoratorNode {
  return new BlockQuoteDecoratorNode(highlightText, highlightContext);
}

export function $isBlockQuoteDecoratorNode(
  node: LexicalNode | null | undefined,
): node is BlockQuoteDecoratorNode {
  return node instanceof BlockQuoteDecoratorNode;
}
