import { $findMatchingParent, addClassNamesToElement } from "@lexical/utils";
import type {
  NodeKey,
  EditorConfig,
  LexicalEditor,
  RootNode,
  LexicalNode,
  RangeSelection,
} from "lexical";
import { $parseSerializedNode, ElementNode } from "lexical";
import { z } from "zod";
import {
  SerializedElementNodeSchema,
  hasToggleElemClicked,
  selectOnlyTopNodes,
} from "~/utils/lexical";
import type { CustomTheme } from "~/utils/lexical/theme";
import {
  $createBlockChildContainerNode,
  $createBlockContentNode,
  $isBlockChildContainerNode,
  $isBlockContentNode,
  type BlockChildContainerNode,
  type BlockContentNode,
} from ".";
import type { Prettify } from "~/utils/types";
import { type BlockNoteNode } from "../BlockNote";

export const BLOCK_CONTAINER_TYPE = "block-container" as const;

const BaseContainerNodeSchema = SerializedElementNodeSchema.extend({
  type: z.string(),
  id: z.string(),
  open: z.boolean(),
  parentId: z.string().nullable(),
  indexWithinParent: z.number(),
  properties: z.unknown(),
  webUrl: z.string().url().nullable(),
});

export type SerializedBlockContainerNode = Prettify<
  z.infer<typeof BaseContainerNodeSchema> & {
    childBlocks?: SerializedBlockContainerNode[];
  }
>;

// HACK: Limitation of zod. To make SerializedBlockContainerNodeSchema extendable
const _SerializedBlockContainerNodeSchema: z.ZodType<SerializedBlockContainerNode> =
  BaseContainerNodeSchema.extend({
    childBlocks: z.lazy(() =>
      _SerializedBlockContainerNodeSchema.array().optional(),
    ),
  });

export const SerializedBlockContainerNodeSchema =
  BaseContainerNodeSchema.extend({
    childBlocks: z.lazy(() =>
      _SerializedBlockContainerNodeSchema.array().optional(),
    ),
  });

export class BlockContainerNode extends ElementNode {
  __open: boolean;
  __id: string;
  __selected: boolean;
  __webUrl: string | null;

  constructor({
    open,
    key,
    id,
    selected,
    webUrl,
  }: {
    webUrl?: string | null;
    open?: boolean;
    selected?: boolean;
    key?: NodeKey;
    id?: string;
  } = {}) {
    super(key);
    this.__open = open ?? true;
    this.__id = id ?? crypto.randomUUID();
    this.__selected = selected ?? false;
    this.__webUrl = webUrl ?? null;
  }

  static clone(node: BlockContainerNode): BlockContainerNode {
    return new BlockContainerNode({
      key: node.__key,
      open: node.__open,
      id: node.__id,
      selected: node.__selected,
      webUrl: node.__webUrl,
    });
  }

  static getType(): string {
    return BLOCK_CONTAINER_TYPE;
  }

  // View
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLDivElement {
    const dom = document.createElement("div");
    const theme = config.theme as CustomTheme;
    const className = theme.block.container;
    if (className !== undefined) {
      addClassNamesToElement(dom, className);
    }

    if (this.__open) {
      dom.classList.add("open");
    } else {
      dom.classList.add("closed");
    }

    if (this.__selected) {
      dom.classList.add("selected");
    } else {
      dom.classList.remove("selected");
    }

    dom.addEventListener("click", (event) => {
      console.log("createDOM click event");
      if (hasToggleElemClicked(event)) {
        editor.update(() => {
          this.toggleOpen();
        });
      }
    });
    return dom;
  }

  updateDOM(prevNode: BlockContainerNode, dom: HTMLDivElement): boolean {
    if (prevNode.__open !== this.__open) {
      dom.classList.remove(...["open", "closed"]);
      if (this.__open) {
        dom.classList.add("open");
      } else {
        dom.classList.add("closed");
      }
    }

    if (prevNode.__selected !== this.__selected) {
      if (this.__selected) {
        dom.classList.add("selected");
      } else {
        dom.classList.remove("selected");
      }
    }
    return false;
  }

  static importJSON(
    serializedNode: SerializedBlockContainerNode,
  ): BlockContainerNode {
    const containerNode = $createBlockContainerNode();

    const contentNode = $createBlockContentNode();

    const childContainerNode = $createBlockChildContainerNode();
    const containerNodes =
      (serializedNode.childBlocks?.map((node) => {
        return $parseSerializedNode(node);
      }) as BlockContainerNode[]) || [];
    childContainerNode.append(...containerNodes);

    containerNode.append(contentNode, childContainerNode);
    containerNode.setId(serializedNode.id);
    containerNode.setOpen(serializedNode.open);
    containerNode.setWebUrl(serializedNode.webUrl);
    return containerNode;
  }

  exportJSON(): SerializedBlockContainerNode {
    const parentBlockContainerNodeId = this.getParentCPContainer()?.getId();

    return {
      ...super.exportJSON(),
      parentId: parentBlockContainerNodeId ?? "",
      indexWithinParent: this.getIndexWithinParent(),
      open: this.getOpen(),
      type: BLOCK_CONTAINER_TYPE,
      id: this.getId(),
      webUrl: this.getWebUrl(),
      version: 1,
    };
  }

  getBlockContentNode() {
    return this.getLatest()
      .getChildren()
      .find((node): node is BlockContentNode => $isBlockContentNode(node))!;
  }

  getBlockChildContainerNode() {
    return this.getLatest()
      .getChildren()
      .find((node): node is BlockChildContainerNode =>
        $isBlockChildContainerNode(node),
      )!;
  }

  getParent<
    T extends ElementNode = BlockChildContainerNode | RootNode,
  >(): T | null {
    return super.getParent();
  }

  getParentCPContainer(): BlockContainerNode | BlockNoteNode | undefined {
    const parent = this.getLatest().getParent<
      BlockChildContainerNode | RootNode
    >();
    if ($isBlockChildContainerNode(parent)) {
      const parentContainer = parent.getParent();
      if (parentContainer) {
        return parentContainer;
      }
    }
  }

  getId(): string {
    return this.getLatest().__id;
  }

  setId(id: string) {
    this.getWritable().__id = id;
  }

  getOpen(): boolean {
    return this.getLatest().__open;
  }

  setOpen(open: boolean) {
    this.getWritable().__open = open;
  }

  toggleOpen(): void {
    this.setOpen(!this.getOpen());
  }

  getSelected(): boolean {
    return this.getLatest().__selected;
  }

  setSelected(selected: boolean) {
    this.getWritable().__selected = selected;
  }

  getWebUrl(): string | null {
    return this.getLatest().__webUrl;
  }

  setWebUrl(webUrl: string | null) {
    this.getWritable().__webUrl = webUrl;
  }
}

export function $createBlockContainerNode(): BlockContainerNode {
  const container = new BlockContainerNode();
  return container;
}

export function $isBlockContainerNode(
  node: LexicalNode | null | undefined,
): node is BlockContainerNode {
  return node instanceof BlockContainerNode;
}

export function $findParentBlockContainer(node: LexicalNode) {
  return $findMatchingParent(
    node,
    (node: LexicalNode): node is BlockContainerNode => {
      return $isBlockContainerNode(node);
    },
  );
}

export function $getSelectedBlocks(selection: RangeSelection) {
  const nodes = selection.getNodes();

  const blocks = [
    ...new Set(
      nodes.flatMap((node) => {
        const result = $findParentBlockContainer(node);
        return !!result ? [result] : [];
      }),
    ),
  ];

  const onlyTopNodes = selectOnlyTopNodes(blocks);
  return onlyTopNodes;
}
