import React, { type FC, useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { $getNodeByKey, TextNode, LineBreakNode } from "lexical";
import { throttle } from "~/utils/lexical";
import {
  BlockContainerNode,
  BlockContentNode,
  BlockChildContainerNode,
  $isBlockContainerNode,
} from "~/nodes/Block";
import { z } from "zod";
import { $findParentBlockContainer } from "~/nodes/Block";
import {
  $isBlockTextNode,
  BlockTextContentNode,
  BlockTextNode,
  SerializedBlockTextNodeSchema,
} from "~/nodes/BlockText";
import { type Prettify } from "~/utils/types";
import {
  BlockHighlightNode,
  SerializedBlockHighlightNodeSchema,
} from "~/nodes/BlockHighlight";
import {
  BlockNoteNode,
  SerializedBlockNoteNodeSchema,
} from "~/nodes/BlockNote";
import { SerializedBlockRemarkNodeSchema } from "~/nodes/BlockRemark";
import { SerializedBlockLinkNodeSchema } from "~/nodes/BlockLink";

export const updatedBlocksSchema = z.union([
  z.object({
    updateType: z.union([z.literal("created"), z.literal("updated")]),
    updatedBlockId: z.string().uuid(),
    updatedBlock: z.union([
      SerializedBlockTextNodeSchema.omit({
        children: true,
        indent: true,
        direction: true,
        format: true,
      }),
      SerializedBlockHighlightNodeSchema.omit({
        children: true,
        indent: true,
        direction: true,
        format: true,
      }),
      SerializedBlockNoteNodeSchema.omit({
        children: true,
        indent: true,
        direction: true,
        format: true,
      }),
      SerializedBlockRemarkNodeSchema.omit({
        children: true,
        indent: true,
        direction: true,
        format: true,
      }),
      SerializedBlockLinkNodeSchema.omit({
        children: true,
        indent: true,
        direction: true,
        format: true,
      }),
    ]),
  }),
  z.object({
    updateType: z.literal("destroyed"),
    updatedBlockId: z.string().uuid(),
    updatedBlock: z.null(),
  }),
]);

export type UpdatedBlock = Prettify<z.infer<typeof updatedBlocksSchema>>;

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
        BlockTextContentNode,
      ])
    ) {
      throw new Error(
        "SendingUpdatesPlugin: Some nodes are not registered on editor",
      );
    }

    return mergeRegister(
      // To send updates
      ...[
        TextNode,
        LineBreakNode,
        BlockContentNode,
        BlockChildContainerNode,
        BlockTextContentNode,
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
                        $isBlockTextNode(updatedParentNode)
                      ) {
                        updatesRef.current.set(
                          `${updatedParentNode.getKey()}:updated`,
                          {
                            updateType: "updated",
                            updatedBlockId: updatedParentNode.getId(),
                            updatedBlock: updatedParentNode.exportJSON(),
                          },
                        );
                      }
                    });
                  });
                  continue;
                }

                const parentContainer = $findParentBlockContainer(node);

                if (parentContainer && $isBlockTextNode(parentContainer)) {
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
      ...[BlockTextNode, BlockHighlightNode, BlockNoteNode].map((Node) => {
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

                if (!$isBlockContainerNode(node) || !$isBlockTextNode(node))
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
