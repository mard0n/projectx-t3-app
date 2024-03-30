import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { addClassNamesToElement } from "@lexical/utils";
import {
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type SerializedLexicalNode,
  type Spread,
  type LexicalEditor,
  $getNodeByKey,
} from "lexical";
import { type ReactNode } from "react";
import { type CustomTheme } from "~/utils/lexical/theme";
import Markdown from "react-markdown";
import { $findParentBlockContainer } from "../Block";
import { $isBlockHighlightNode } from ".";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Link } from "lucide-react";

export type SerializedBlockQuoteDecoratorNode = Spread<
  object,
  SerializedLexicalNode
>;

function BlockQuoteComponent({
  highlightText,
  linkToHighlight,
  commentText,
  handleCommentChange,
}: {
  highlightText: string;
  linkToHighlight?: string | null;
  commentText?: string;
  handleCommentChange: (comment: string) => void;
}) {
  const [editor] = useLexicalComposerContext();

  // useEffect(() => {
  //   return mergeRegister(
  //     editor.registerCommand(
  //       CLICK_COMMAND,
  //       (event: MouseEvent) => {
  //         return false;
  //       },
  //       COMMAND_PRIORITY_LOW,
  //     ),
  //   );
  // }, [editor]);

  // useEffect(() => {
  //   const pbElem = editor.getElementByKey(nodeKey);
  //   if (pbElem !== null) {
  //     pbElem.className = isSelected ? 'selected' : '';
  //   }
  // }, [editor, isSelected, nodeKey]);

  // TODO: figure out why drizzle db:push fails when component exist
  return (
    <>
      <div className="container">
        <Markdown
          components={{
            code(props) {
              const { node, inline, className, children, ...rest } = props;
              console.log("className", className);
              console.log("children", children);

              const match = /language-(\w+)/.exec(className ?? "");
              console.log("inline", inline);
              console.log("match", match);

              return !inline && match ? (
                <SyntaxHighlighter
                  {...rest}
                  style={oneLight}
                  PreTag="div"
                  language={match[1]}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            },
          }}
        >
          {highlightText}
        </Markdown>
        {commentText ? (
          <div className="comment">
            <div className="comment-container">
              <p>{commentText}</p>
              <div className="drop-shadow-dotted" />
            </div>
          </div>
        ) : null}
        <div className="drop-shadow" />
        {linkToHighlight ? (
          <a href={linkToHighlight} target="_blank" rel="noopener noreferrer">
            <div className="link-box">
              <Link size={16} color="#ffffff" strokeWidth={1.5} />
            </div>
          </a>
        ) : null}
      </div>
    </>
  );
  // return null;
}

export class BlockQuoteDecoratorNode extends DecoratorNode<ReactNode> {
  constructor(key?: string) {
    super(key);
  }

  static getType(): string {
    return "block-quote-decorator";
  }

  static clone(node: BlockQuoteDecoratorNode): BlockQuoteDecoratorNode {
    return new BlockQuoteDecoratorNode(node.__key);
  }

  static importJSON(
    serializedNode: SerializedBlockQuoteDecoratorNode,
  ): BlockQuoteDecoratorNode {
    const node = $createBlockQuoteDecoratorNode();
    return node;
  }

  exportJSON(): SerializedBlockQuoteDecoratorNode {
    return {
      ...super.exportJSON(),
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

  getHighlightText(): string | undefined {
    const node = $getNodeByKey(this.getKey());
    if (!node) return;
    const blockNode = $findParentBlockContainer(node);
    if (blockNode && $isBlockHighlightNode(blockNode)) {
      return blockNode.getHighlightText();
    }
  }
  getHighlightPath(): string | undefined | null {
    const node = $getNodeByKey(this.getKey());
    if (!node) return;
    const blockNode = $findParentBlockContainer(node);
    if (blockNode && $isBlockHighlightNode(blockNode)) {
      return blockNode.getHighlightPath();
    }
  }

  getCommentText(): string | undefined {
    const node = $getNodeByKey(this.getKey());
    if (!node) return;
    const blockNode = $findParentBlockContainer(node);
    if (blockNode && $isBlockHighlightNode(blockNode)) {
      return blockNode.getCommentText();
    }
  }

  handleCommentChange(comment: string, editor: LexicalEditor) {
    editor.update(() => {
      const node = $getNodeByKey(this.getKey());
      if (!node) return;
      const blockNode = $findParentBlockContainer(node);
      if (blockNode && $isBlockHighlightNode(blockNode)) {
        blockNode.setCommentText(comment);
      }
    });
  }

  // TODO: figure out why drizzle db:push fails when component exist
  decorate(_editor: LexicalEditor): ReactNode {
    const highlightText = this.getHighlightText();
    const commentText = this.getCommentText();
    const linkToHighlight = this.getHighlightPath();
    return highlightText ? (
      <BlockQuoteComponent
        highlightText={highlightText}
        commentText={commentText}
        linkToHighlight={linkToHighlight}
        handleCommentChange={(comment: string) =>
          this.handleCommentChange(comment, _editor)
        }
      />
    ) : null;
  }
  // decorate(): ReactNode {
  //   return null;
  // }
}

export function $createBlockQuoteDecoratorNode(): BlockQuoteDecoratorNode {
  return new BlockQuoteDecoratorNode();
}

export function $isBlockQuoteDecoratorNode(
  node: LexicalNode | null | undefined,
): node is BlockQuoteDecoratorNode {
  return node instanceof BlockQuoteDecoratorNode;
}
