import React, { type FC, useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import type { NodeMutation } from "lexical";
import { $getNodeByKey, TextNode, LineBreakNode } from "lexical";
import { $findParentBlockContainer } from "~/nodes/Block";
import { throttle } from "~/utils/lexical";
import {
  BlockContainerNode,
  BlockTextNode,
  BlockChildContainerNode,
} from "../HierarchicalBlocksPlugin";
import {
  BlockHeaderNode,
  type SerializedBlockHeaderNode,
} from "~/nodes/BlockHeader";
import {
  BlockParagraphNode,
  SerializedBlockParagraphNodeSchema,
  type SerializedBlockParagraphNode,
} from "~/nodes/BlockParagraph";
import { z } from "zod";
import { SerializedBlockHeaderNodeSchema } from "~/nodes/BlockHeader/BlockHeaderNode";
import {
  type SerializedBlockHighlightCommentNode,
  SerializedBlockHighlightCommentNodeSchema,
} from "~/nodes/BlockHighlightComment";
import {
  type SerializedBlockHighlightParagraphNode,
  SerializedBlockHighlightParagraphNodeSchema,
} from "~/nodes/BlockHighlightParagraph";

export const updatedBlocksSchema: z.ZodSchema<UpdatedBlock> = z.object({
  updateType: z.union([
    z.literal("created"),
    z.literal("updated"),
    z.literal("destroyed"),
  ]),
  updatedBlockId: z.string().uuid(),
  updatedBlock: z
    .union([
      SerializedBlockParagraphNodeSchema,
      SerializedBlockHeaderNodeSchema,
      SerializedBlockHighlightCommentNodeSchema,
      SerializedBlockHighlightParagraphNodeSchema,
    ])
    .nullable(),
});

export type UpdatedBlock = {
  updateType: NodeMutation;
  updatedBlockId: string;
  updatedBlock:
    | SerializedBlockHeaderNode
    | SerializedBlockParagraphNode
    | SerializedBlockHighlightCommentNode
    | SerializedBlockHighlightParagraphNode
    | null;
};

export type Updates = Map<string, UpdatedBlock>;

interface SendingUpdatesPluginProps {
  handleUpdates: (updates: Updates) => void;
}

const SendingUpdatesPlugin: FC<SendingUpdatesPluginProps> = ({
  handleUpdates,
}) => {
  const [editor] = useLexicalComposerContext();
  const updatesRef = useRef<Updates>(new Map());

  const throttleUpdate = throttle(
    (updates: Updates, updatesRef: React.MutableRefObject<Updates>) => {
      handleUpdates(updates);
      updatesRef.current.clear();
    },
    500,
  );

  useEffect(() => {
    if (
      !editor.hasNodes([
        BlockContainerNode,
        BlockTextNode,
        BlockChildContainerNode,
      ])
    ) {
      throw new Error(
        "HierarchicalBlockPlugin: BlockContainerNode, BlockTextNode, or BlockChildContainerNode not registered on editor",
      );
    }

    return mergeRegister(
      // To send updates
      ...[TextNode, LineBreakNode, BlockTextNode, BlockChildContainerNode].map(
        (Node) =>
          editor.registerMutationListener(
            Node,
            (mutations, { prevEditorState }) => {
              editor.getEditorState().read(() => {
                for (const [nodeKey, mutation] of mutations) {
                  const node = $getNodeByKey(nodeKey);
                  if (!node || mutation === "destroyed") {
                    prevEditorState.read(() => {
                      const prevNode = $getNodeByKey(nodeKey);
                      if (!prevNode) return;

                      const parentContainer =
                        $findParentBlockContainer(prevNode);

                      const parentKey = parentContainer?.getKey();

                      if (!parentKey) return;
                      editor.getEditorState().read(() => {
                        const updatedParentNode =
                          $getNodeByKey<BlockContainerNode>(parentKey);

                        if (updatedParentNode) {
                          updatesRef.current.set(
                            `${updatedParentNode.getKey()}:updated`,
                            {
                              updateType: "updated",
                              updatedBlockId: updatedParentNode.getId(),
                              updatedBlock: null,
                            },
                          );
                        }
                      });
                    });
                    continue;
                  }

                  const parentContainer = $findParentBlockContainer(node) as
                    | BlockParagraphNode
                    | BlockHeaderNode; // TODO: This is tedious way of doing it.

                  if (parentContainer) {
                    updatesRef.current.set(
                      `${parentContainer.getKey()}:${mutation}`,
                      {
                        updateType: mutation,
                        updatedBlockId: parentContainer.getId(),
                        updatedBlock: parentContainer.exportJSON(),
                      },
                    );
                  }
                }

                throttleUpdate(updatesRef.current, updatesRef);
              });
            },
          ),
      ),
      ...[BlockParagraphNode, BlockHeaderNode].map((node) => {
        return editor.registerMutationListener(
          node,
          (mutations, { prevEditorState }) => {
            editor.getEditorState().read(() => {
              for (const [nodeKey, mutation] of mutations) {
                const node = $getNodeByKey<
                  BlockParagraphNode | BlockHeaderNode // TODO: This one as well. Not ideal
                >(nodeKey);

                if (!node || mutation === "destroyed") {
                  prevEditorState.read(() => {
                    const prevNode = $getNodeByKey<
                      BlockParagraphNode | BlockHeaderNode // TODO: This one as well. Not ideal
                    >(nodeKey);
                    if (!prevNode) return;

                    updatesRef.current.set(`${nodeKey}:destroyed`, {
                      updateType: "destroyed",
                      updatedBlockId: prevNode.getId(),
                      updatedBlock: null,
                    });
                  });
                  continue;
                }

                updatesRef.current.set(`${nodeKey}:${mutation}`, {
                  updateType: mutation,
                  updatedBlockId: node.getId(),
                  updatedBlock: node.exportJSON(),
                });
              }
              // First setupdates then debounce Promise/async
              throttleUpdate(updatesRef.current, updatesRef);
            });
          },
        );
      }),
    );
  }, [editor]);

  return null;
};

export { SendingUpdatesPlugin };
