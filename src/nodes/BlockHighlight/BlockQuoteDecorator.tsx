import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { addClassNamesToElement } from "@lexical/utils";
import {
  DecoratorNode,
  type NodeKey,
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
import {
  Card,
  CardContent,
  FormControl,
  FormLabel,
  Stack,
  Textarea,
  Typography,
} from "@mui/joy";
import { $findParentBlockContainer } from "../Block";
import { $isBlockHighlightNode } from ".";

export type SerializedBlockQuoteDecoratorNode = Spread<
  {
    highlightText: string;
    commentText: string;
  },
  SerializedLexicalNode
>;

function BlockQuoteComponent({
  highlightText,
  commentText,
  handleCommentChange,
}: {
  highlightText: string;
  commentText: string;
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
    <Stack spacing={1} sx={{ pb: 2 }}>
      <Card variant="soft">
        <CardContent>
          <Markdown
            components={{
              h1(props) {
                return <Typography {...props} color="neutral" level="h3" />;
              },
              h2(props) {
                return <Typography {...props} color="neutral" level="h4" />;
              },
              h3(props) {
                return <Typography {...props} color="neutral" level="h4" />;
              },
              p(props) {
                return (
                  <Typography {...props} color="neutral" level="body-md" />
                );
              },
            }}
          >
            {highlightText}
          </Markdown>
        </CardContent>
      </Card>
      {commentText ? (
        <CardContent>
          <FormControl>
            <FormLabel>Comment</FormLabel>
            <Textarea
              defaultValue={commentText}
              placeholder="Add your comment..."
              minRows={1}
              onBlur={(e) => handleCommentChange(e.target.value)}
            />
          </FormControl>
        </CardContent>
      ) : null}
    </Stack>
  );
  // return null;
}

export class BlockQuoteDecoratorNode extends DecoratorNode<ReactNode> {
  __highlightText: string;
  __commentText: string;

  constructor(highlightText: string, commentText: string, key?: string) {
    super(key);
    this.__highlightText = highlightText;
    this.__commentText = commentText;
  }

  static getType(): string {
    return "block-quote-decorator";
  }

  static clone(node: BlockQuoteDecoratorNode): BlockQuoteDecoratorNode {
    return new BlockQuoteDecoratorNode(
      node.__highlightText,
      node.__commentText,
      node.__key,
    );
  }

  static importJSON(
    serializedNode: SerializedBlockQuoteDecoratorNode,
  ): BlockQuoteDecoratorNode {
    const node = $createBlockQuoteDecoratorNode(
      serializedNode.highlightText,
      serializedNode.commentText,
    );
    return node;
  }

  exportJSON(): SerializedBlockQuoteDecoratorNode {
    return {
      ...super.exportJSON(),
      highlightText: this.getHighlightText() ?? "",
      commentText: this.getCommentText() ?? "",
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

  getHighlightText() {
    return this.getLatest().__highlightText;
  }

  setHighlightText(highlightText: string) {
    this.getWritable().__highlightText = highlightText;
  }

  getCommentText() {
    return this.getLatest().__commentText;
  }

  setCommentText(commentText: string) {
    this.getWritable().__commentText = commentText;
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
    return (
      <BlockQuoteComponent
        highlightText={this.__highlightText}
        commentText={this.__commentText}
        handleCommentChange={(comment: string) =>
          this.handleCommentChange(comment, _editor)
        }
      />
    );
  }
  // decorate(): ReactNode {
  //   return null;
  // }
}

export function $createBlockQuoteDecoratorNode(
  highlightText: string,
  commentText: string,
): BlockQuoteDecoratorNode {
  return new BlockQuoteDecoratorNode(highlightText, commentText);
}

export function $isBlockQuoteDecoratorNode(
  node: LexicalNode | null | undefined,
): node is BlockQuoteDecoratorNode {
  return node instanceof BlockQuoteDecoratorNode;
}
