import React, { type FC, useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { $getNodeByKey, TextNode, LineBreakNode, ParagraphNode } from "lexical";
import { throttle } from "~/utils/lexical";
import {
  BlockContainerNode,
  BlockContentNode,
  BlockChildContainerNode,
  $isBlockContainerNode,
} from "~/nodes/Block";
import { z } from "zod";
import { $findParentBlockContainer } from "~/nodes/Block";
import { HeaderNode } from "~/nodes/Header";
import {
  $isBlockHighlightNode,
  BlockHighlightNode,
  SerializedBlockHighlightNodeSchema,
} from "~/nodes/BlockHighlight";
import {
  $isBlockParagraphNode,
  BlockParagraphNode,
  SerializedBlockParagraphNodeSchema,
} from "~/nodes/BlockParagraph/BlockParagraph";

export const updatedBlocksSchema = z.object({
  updateType: z.union([
    z.literal("created"),
    z.literal("updated"),
    z.literal("destroyed"),
  ]),
  updatedBlockId: z.string().uuid(),
  updatedBlock: z
    .union([
      SerializedBlockParagraphNodeSchema,
      SerializedBlockHighlightNodeSchema,
    ])
    .nullable(),
});

export type UpdatedBlock = z.infer<typeof updatedBlocksSchema>;

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
        BlockContentNode,
        BlockChildContainerNode,
        ParagraphNode,
        HeaderNode,
      ])
    ) {
      throw new Error(
        "HierarchicalBlockPlugin: BlockContainerNode, BlockContentNode, BlockChildContainerNode, ParagraphNode, or HeaderNode not registered on editor",
      );
    }

    return mergeRegister(
      // To send updates
      ...[
        TextNode,
        LineBreakNode,
        ParagraphNode,
        HeaderNode,
        BlockContentNode,
        BlockChildContainerNode,
      ].map((Node) =>
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

                    const parentContainer = $findParentBlockContainer(prevNode);

                    const parentKey = parentContainer?.getKey();

                    if (!parentKey) return;
                    editor.getEditorState().read(() => {
                      const updatedParentNode = $getNodeByKey(parentKey);

                      if (
                        updatedParentNode &&
                        ($isBlockParagraphNode(updatedParentNode) ||
                          $isBlockHighlightNode(updatedParentNode))
                      ) {
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

                const parentContainer = $findParentBlockContainer(node);

                if (
                  parentContainer &&
                  ($isBlockParagraphNode(parentContainer) ||
                    $isBlockHighlightNode(parentContainer))
                ) {
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
      ...[BlockParagraphNode, BlockHighlightNode].map((Node) => {
        return editor.registerMutationListener(
          Node,
          (mutations, { prevEditorState }) => {
            editor.getEditorState().read(() => {
              for (const [nodeKey, mutation] of mutations) {
                const node = $getNodeByKey(nodeKey);

                if (!node || mutation === "destroyed") {
                  prevEditorState.read(() => {
                    const prevNode = $getNodeByKey(nodeKey);
                    if (!prevNode || !$isBlockContainerNode(prevNode)) return;

                    updatesRef.current.set(`${nodeKey}:destroyed`, {
                      updateType: "destroyed",
                      updatedBlockId: prevNode.getId(),
                      updatedBlock: null,
                    });
                  });
                  continue;
                }

                if (
                  !$isBlockContainerNode(node) ||
                  !$isBlockParagraphNode(node) ||
                  !$isBlockHighlightNode(node)
                )
                  continue;

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
