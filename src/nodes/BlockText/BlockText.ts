import type {
  NodeKey,
  EditorConfig,
  LexicalNode,
  LexicalEditor,
  SerializedTextNode,
  TextNode,
  LineBreakNode,
  DOMExportOutput,
} from "lexical";
import { $parseSerializedNode } from "lexical";
import { z } from "zod";
import {
  $createBlockChildContainerNode,
  BlockContainerNode,
  SerializedBlockContainerNodeSchema,
} from "../Block";
import { $createBlockTextContentNode } from "./BlockTextContent";
import { type CustomTheme } from "~/utils/lexical/theme";
import { addClassNamesToElement } from "@lexical/utils";

export const BLOCK_TEXT_TYPE = "block-text" as const;

const BlockTextTagTypeSchema = z.enum(["h1", "h2", "h3", "p"]);
export type BlockTextTagType = z.infer<typeof BlockTextTagTypeSchema>;

export const SerializedBlockTextNodeSchema =
  SerializedBlockContainerNodeSchema.extend({
    type: z.literal(BLOCK_TEXT_TYPE),
    properties: z.object({
      tag: BlockTextTagTypeSchema,
      content: z.string(),
    }),
  });

export type SerializedBlockTextNode = z.infer<
  typeof SerializedBlockTextNodeSchema
>;

export class BlockTextNode extends BlockContainerNode {
  __tag: BlockTextTagType;

  constructor({
    tag,
    open,
    key,
    id,
    selected,
  }: {
    tag: BlockTextTagType;
    open?: boolean;
    selected?: boolean;
    key?: NodeKey;
    id?: string;
  }) {
    super({ key, open, id, selected });
    this.__tag = tag;
  }

  static clone(node: BlockTextNode): BlockTextNode {
    return new BlockTextNode({
      tag: node.__tag,
      key: node.__key,
      open: node.__open,
      id: node.__id,
      selected: node.__selected,
    });
  }

  static getType(): string {
    return BLOCK_TEXT_TYPE;
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = super.createDOM(config, editor);
    const tag = this.__tag;
    const theme = config.theme as CustomTheme;
    const blockContainer = theme.blockText.container;
    const tagName = theme.blockText.tags[tag];
    addClassNamesToElement(dom, blockContainer, tagName);
    return dom;
  }

  updateDOM(prevNode: BlockTextNode, dom: HTMLDivElement): boolean {
    return super.updateDOM(prevNode, dom);
  }

  static importJSON(serializedNode: SerializedBlockTextNode): BlockTextNode {
    const contentText = JSON.parse(
      serializedNode.properties.content,
    ) as SerializedTextNode[];
    const contentChildren = contentText.map((node) =>
      $parseSerializedNode(node),
    ) as (TextNode | LineBreakNode)[]; // TODO: put a propper guard

    const containerNodes =
      (serializedNode.childBlocks?.map((node) => {
        return $parseSerializedNode(node);
      }) as BlockContainerNode[]) || [];

    const container = $createBlockTextNode({
      tag: serializedNode.properties.tag,
      contentChildren: contentChildren,
      childBlocks: containerNodes,
    });
    container.setId(serializedNode.id);
    container.setOpen(serializedNode.open);
    container.setWebUrl(serializedNode.webUrl);
    return container;
  }

  exportJSON(): SerializedBlockTextNode {
    const contentNode = this.getBlockContentNode();
    const content = JSON.stringify(
      contentNode.getChildren().map((node) => node.exportJSON()),
    );

    return {
      ...super.exportJSON(),
      type: BLOCK_TEXT_TYPE,
      version: 1,
      properties: {
        tag: this.getTag(),
        content: content,
      },
    };
  }

  // static importDOM(): DOMConversionMap<HTMLDivElement> | null {
  //   return {
  //     div: (domNode: HTMLDivElement) => {
  //       if (!domNode.classList.contains(customTheme.blockText.container)) {
  //         return null;
  //       }
  //       return {
  //         conversion: (element: HTMLElement): DOMConversionOutput => {
  //           let tag: BlockTextTagType = "p";
  //           for (const [key, value] of Object.entries(
  //             customTheme.blockText.tags,
  //           ) as Entries<typeof customTheme.blockText.tags>) {
  //             if (element.className.includes(value)) {
  //               tag = key;
  //             }
  //           }
  //           const node = $createBlockTextNode({ tag, includeChildren: false });
  //           return { node };
  //         },
  //         priority: 2,
  //       };
  //     },
  //   };
  // }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = this.createDOM(editor._config, editor);
    return { element };
  }

  getTag(): BlockTextTagType {
    return this.__tag;
  }
}

export function $createBlockTextNode({
  tag,
  contentChildren,
  childBlocks,
  includeChildren = true,
}: {
  tag: BlockTextTagType;
  contentChildren?: (TextNode | LineBreakNode)[];
  childBlocks?: BlockContainerNode[];
  includeChildren?: boolean;
}): BlockTextNode {
  const container = new BlockTextNode({ tag });
  if (!includeChildren) {
    return container;
  }
  const content = $createBlockTextContentNode(tag);
  const childContainer = $createBlockChildContainerNode();

  if (contentChildren?.length) {
    content.append(...contentChildren);
  }

  if (childBlocks?.length) {
    childContainer.append(...childBlocks);
  }

  container.append(content, childContainer);
  return container;
}

export function $isBlockTextNode(
  node: LexicalNode | null | undefined,
): node is BlockTextNode {
  return node instanceof BlockTextNode;
}
