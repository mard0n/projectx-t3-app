import { addClassNamesToElement } from "@lexical/utils";
import {
  DecoratorNode,
  type NodeKey,
  type EditorConfig,
  type LexicalNode,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { type ReactNode } from "react";
import { type CustomTheme } from "~/utils/lexical/theme";

export type SerializedBlockLinkDecoratorNode = Spread<
  {
    title: string;
    desc?: string;
    linkUrl: string;
    linkAlt: string;
    thumbnail?: string;
  },
  SerializedLexicalNode
>;

function BlockLinkComponent({
  title,
  desc,
  linkUrl,
  linkAlt,
  thumbnail,
}: {
  title: string;
  desc?: string;
  linkUrl: string;
  linkAlt: string;
  thumbnail?: string;
}) {
  // return null;
  return (
    <div>
      <div>
        <a href={linkUrl}>

        <h3>{title}</h3>
        {desc ? <small>{desc}</small> : null}
        </a>
        <a href={linkUrl}>{linkAlt}</a>
      </div>
      {thumbnail ? (
        <div>
          <img src={thumbnail} alt="image" />
        </div>
      ) : null}
      </div>
  );
}

export class BlockLinkDecoratorNode extends DecoratorNode<ReactNode> {
  __title: string;
  __desc?: string;
  __linkUrl: string;
  __linkAlt: string;
  __thumbnail?: string;

  constructor({
    title,
    desc,
    linkUrl,
    linkAlt,
    thumbnail,
    key,
  }: {
    title: string;
    desc?: string;
    linkUrl: string;
    linkAlt: string;
    thumbnail?: string;
    key?: NodeKey;
  }) {
    super(key);
    this.__title = title;
    this.__desc = desc;
    this.__linkUrl = linkUrl;
    this.__linkAlt = linkAlt;
    this.__thumbnail = thumbnail;
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

  decorate(): ReactNode {
    return (
      <BlockLinkComponent
        title={this.__title}
        desc={this.__desc}
        linkUrl={this.__linkUrl}
        linkAlt={this.__linkAlt}
        thumbnail={this.__thumbnail}
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
}: {
  title: string;
  desc?: string;
  linkUrl: string;
  linkAlt: string;
  thumbnail?: string;
}): BlockLinkDecoratorNode {
  return new BlockLinkDecoratorNode({
    title,
    desc,
    linkUrl,
    linkAlt,
    thumbnail,
  });
}

export function $isBlockLinkDecoratorNode(
  node: LexicalNode | null | undefined,
): node is BlockLinkDecoratorNode {
  return node instanceof BlockLinkDecoratorNode;
}
