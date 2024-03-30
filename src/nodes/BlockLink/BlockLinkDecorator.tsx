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
import { $findParentBlockContainer } from "../Block";
import { $isBlockLinkNode } from ".";
import { Link } from "lucide-react";

export type SerializedBlockLinkDecoratorNode = Spread<
  object,
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
  linkAlt?: string;
  thumbnail?: string;
  commentText?: string;
  handleCommentChange: (comment: string) => void;
}) {
  return (
    <div className="container">
      <h2>{title}</h2>
      {desc ? <p>{desc}</p> : null}
      <div className="source-link">
        <a href={linkUrl}>{linkAlt}</a>
      </div>
      <div className="drop-shadow" />
      {commentText ? (
        <div className="comment">
          <div className="comment-container">
            <p>{commentText}</p>
            <div className="drop-shadow-dotted" />
          </div>
        </div>
      ) : null}
      <a href={linkUrl} target="_blank" rel="noopener noreferrer">
        <div className="link-box">
          <Link size={16} color="#ffffff" strokeWidth={1.5} />
        </div>
      </a>
    </div>
  );
}

export class BlockLinkDecoratorNode extends DecoratorNode<ReactNode> {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return "block-link-decorator";
  }

  static clone(node: BlockLinkDecoratorNode): BlockLinkDecoratorNode {
    return new BlockLinkDecoratorNode();
  }

  static importJSON(
    serializedNode: SerializedBlockLinkDecoratorNode,
  ): BlockLinkDecoratorNode {
    const node = $createBlockLinkDecoratorNode();
    return node;
  }

  exportJSON(): SerializedBlockLinkDecoratorNode {
    return {
      ...super.exportJSON(),
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

  getTitle(): string | undefined {
    const node = $getNodeByKey(this.getKey());
    if (!node) return;
    const blockNode = $findParentBlockContainer(node);
    if (blockNode && $isBlockLinkNode(blockNode)) {
      return blockNode.getTitle();
    }
  }
  getDesc(): string | undefined {
    const node = $getNodeByKey(this.getKey());
    if (!node) return;
    const blockNode = $findParentBlockContainer(node);
    if (blockNode && $isBlockLinkNode(blockNode)) {
      return blockNode.getDesc();
    }
  }
  getLinkUrl(): string | undefined {
    const node = $getNodeByKey(this.getKey());
    if (!node) return;
    const blockNode = $findParentBlockContainer(node);
    if (blockNode && $isBlockLinkNode(blockNode)) {
      return blockNode.getLinkUrl();
    }
  }
  getLinkAlt(): string | undefined {
    const node = $getNodeByKey(this.getKey());
    if (!node) return;
    const blockNode = $findParentBlockContainer(node);
    if (blockNode && $isBlockLinkNode(blockNode)) {
      return blockNode.getLinkAlt();
    }
  }
  getThumbnail(): string | undefined {
    const node = $getNodeByKey(this.getKey());
    if (!node) return;
    const blockNode = $findParentBlockContainer(node);
    if (blockNode && $isBlockLinkNode(blockNode)) {
      return blockNode.getThumbnail();
    }
  }
  getCommentText(): string | undefined {
    const node = $getNodeByKey(this.getKey());
    if (!node) return;
    const blockNode = $findParentBlockContainer(node);
    if (blockNode && $isBlockLinkNode(blockNode)) {
      return blockNode.getCommentText();
    }
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
    const title = this.getTitle();
    const desc = this.getDesc();
    const linkUrl = this.getLinkUrl();
    const linkAlt = this.getLinkAlt();
    const thumbnail = this.getThumbnail();
    const commentText = this.getCommentText();
    return title && linkUrl ? (
      <BlockLinkComponent
        title={title}
        desc={desc}
        linkUrl={linkUrl}
        linkAlt={linkAlt}
        thumbnail={thumbnail}
        commentText={commentText}
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

export function $createBlockLinkDecoratorNode(): BlockLinkDecoratorNode {
  return new BlockLinkDecoratorNode();
}

export function $isBlockLinkDecoratorNode(
  node: LexicalNode | null | undefined,
): node is BlockLinkDecoratorNode {
  return node instanceof BlockLinkDecoratorNode;
}
