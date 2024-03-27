import { addClassNamesToElement } from "@lexical/utils";
import {
  AspectRatio,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  Link,
  Stack,
  Textarea,
  Typography,
} from "@mui/joy";
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
import { $findParentBlockContainer } from "../Block";
import { $isBlockHighlightNode } from "../BlockHighlight";
import { $isBlockLinkNode } from ".";

export type SerializedBlockLinkDecoratorNode = Spread<
  {
    title: string;
    desc?: string;
    linkUrl: string;
    linkAlt: string;
    thumbnail?: string;
    commentText: string;
  },
  SerializedLexicalNode
>;

function BlockLinkComponent({
  title,
  desc,
  linkUrl,
  linkAlt,
  thumbnail,
  commentText,
  handleCommentChange,
}: {
  title: string;
  desc?: string;
  linkUrl: string;
  linkAlt: string;
  thumbnail?: string;
  commentText: string;
  handleCommentChange: (comment: string) => void;
}) {
  // return null;
  return (
    <Stack spacing={1} sx={{ pb: 2 }}>
      <Card orientation="horizontal">
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Typography
              level="title-md"
              sx={{
                "white-space": "nowrap",
                overflow: "hidden",
                "text-overflow": "ellipsis",
              }}
            >
              {title}
            </Typography>
            {desc ? (
              <Typography
                level="body-sm"
                sx={{
                  display: "-webkit-box",
                  "-webkit-box-orient": "vertical",
                  "-webkit-line-clamp": "2",
                  overflow: "hidden",
                }}
              >
                {desc}
              </Typography>
            ) : null}
          </Stack>
          <Stack>
            <Link
              overlay
              underline="none"
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              level="title-sm"
              sx={{ fontWeight: "var(--joy-fontWeight-lg)" }}
            >
              {linkAlt}
            </Link>
          </Stack>
        </Stack>
        {thumbnail ? (
          <AspectRatio ratio="21/9" flex={true} sx={{ flexBasis: 400 }}>
            <img src={thumbnail} alt="image" />
          </AspectRatio>
        ) : null}
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
}

export class BlockLinkDecoratorNode extends DecoratorNode<ReactNode> {
  __title: string;
  __desc?: string;
  __linkUrl: string;
  __linkAlt: string;
  __thumbnail?: string;
  __commentText: string;

  constructor({
    title,
    desc,
    linkUrl,
    linkAlt,
    thumbnail,
    commentText,
    key,
  }: {
    title: string;
    desc?: string;
    linkUrl: string;
    linkAlt: string;
    thumbnail?: string;
    commentText: string;
    key?: NodeKey;
  }) {
    super(key);
    this.__title = title;
    this.__desc = desc;
    this.__linkUrl = linkUrl;
    this.__linkAlt = linkAlt;
    this.__thumbnail = thumbnail;
    this.__commentText = commentText;
  }

  static getType(): string {
    return "block-link-decorator";
  }

  static clone(node: BlockLinkDecoratorNode): BlockLinkDecoratorNode {
    return new BlockLinkDecoratorNode({
      title: node.__title,
      desc: node.__desc,
      linkUrl: node.__linkUrl,
      linkAlt: node.__linkAlt,
      thumbnail: node.__thumbnail,
      commentText: node.__commentText,
    });
  }

  static importJSON(
    serializedNode: SerializedBlockLinkDecoratorNode,
  ): BlockLinkDecoratorNode {
    const node = $createBlockLinkDecoratorNode({
      title: serializedNode.title,
      desc: serializedNode.desc,
      linkUrl: serializedNode.linkUrl,
      linkAlt: serializedNode.linkAlt,
      thumbnail: serializedNode.thumbnail,
      commentText: serializedNode.commentText,
    });
    return node;
  }

  exportJSON(): SerializedBlockLinkDecoratorNode {
    return {
      ...super.exportJSON(),
      title: this.getTitle(),
      desc: this.getDesc(),
      linkUrl: this.getLinkUrl(),
      linkAlt: this.getLinkAlt(),
      thumbnail: this.getThumbnail(),
      commentText: this.getCommentText(),
      version: 1,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    const theme = config.theme as CustomTheme;
    const className = theme.block.content;
    const classNameHighlight = theme.blockLink.content;
    if (className !== undefined) {
      addClassNamesToElement(dom, className, classNameHighlight);
    }
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  getTitle(): string {
    return this.getLatest().__title;
  }
  getDesc(): string | undefined {
    return this.getLatest().__desc;
  }
  getLinkUrl(): string {
    return this.getLatest().__linkUrl;
  }
  getLinkAlt(): string {
    return this.getLatest().__linkAlt;
  }
  getThumbnail(): string | undefined {
    return this.getLatest().__thumbnail;
  }
  getCommentText(): string {
    return this.getLatest().__commentText;
  }

  handleCommentChange(comment: string, editor: LexicalEditor) {
    editor.update(() => {
      const node = $getNodeByKey(this.getKey());
      if (!node) return;
      const blockNode = $findParentBlockContainer(node);
      if (blockNode && $isBlockLinkNode(blockNode)) {
        blockNode.setCommentText(comment);
      }
    });
  }

  decorate(_editor: LexicalEditor): ReactNode {
    return (
      <BlockLinkComponent
        title={this.__title}
        desc={this.__desc}
        linkUrl={this.__linkUrl}
        linkAlt={this.__linkAlt}
        thumbnail={this.__thumbnail}
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

export function $createBlockLinkDecoratorNode({
  title,
  desc,
  linkUrl,
  linkAlt,
  thumbnail,
  commentText,
}: {
  title: string;
  desc?: string;
  linkUrl: string;
  linkAlt: string;
  thumbnail?: string;
  commentText: string;
}): BlockLinkDecoratorNode {
  return new BlockLinkDecoratorNode({
    title,
    desc,
    linkUrl,
    linkAlt,
    thumbnail,
    commentText,
  });
}

export function $isBlockLinkDecoratorNode(
  node: LexicalNode | null | undefined,
): node is BlockLinkDecoratorNode {
  return node instanceof BlockLinkDecoratorNode;
}
