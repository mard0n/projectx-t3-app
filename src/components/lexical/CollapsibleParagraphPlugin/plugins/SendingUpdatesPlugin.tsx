import React, { type FC, useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import type { NodeMutation } from "lexical";
import { $getNodeByKey, TextNode, LineBreakNode } from "lexical";
import { BlockTextNode, BlockChildContainerNode, BlockContainerNode } from "..";
import {
  $findParentCPContainer,
  type SerializedBlockContainerNode,
} from "../BlockContainer";
import { throttle } from "../utils";

export type UpdatedBlock = {
  updateType: NodeMutation;
  updatedBlockId: string;
  updatedBlock: SerializedBlockContainerNode | null;
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
      !editor.hasNodes([BlockContainerNode, BlockTextNode, BlockChildContainerNode])
    ) {
      throw new Error(
        "CollapsibleParagraphPlugin: BlockContainerNode, BlockTextNode, or BlockChildContainerNode not registered on editor",
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

                      const parentContainer = $findParentCPContainer(prevNode);

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

                  const parentContainer = $findParentCPContainer(node);

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
      editor.registerMutationListener(
        BlockContainerNode,
        (mutations, { prevEditorState }) => {
          editor.getEditorState().read(() => {
            for (const [nodeKey, mutation] of mutations) {
              const node = $getNodeByKey<BlockContainerNode>(nodeKey);

              if (!node || mutation === "destroyed") {
                prevEditorState.read(() => {
                  const prevNode = $getNodeByKey<BlockContainerNode>(nodeKey);
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
      ),
    );
  }, [editor]);

  return null;
};

export { SendingUpdatesPlugin };
