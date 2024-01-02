import React, { type FC, useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import type { NodeMutation } from "lexical";
import { $getNodeByKey, TextNode, LineBreakNode } from "lexical";
import { $findMatchingParent } from "@lexical/utils";
import {
  CPTitleNode,
  CPChildContainerNode,
  is_PARAGRAGRAPH,
  CPContainerNode,
} from "..";
import type { SerializedCPContainerNode } from "../CPContainer";
import { throttle } from "../utils";

export type UpdatedBlock = {
  updateType: NodeMutation;
  updatedBlockId: string;
  updatedBlock: SerializedCPContainerNode | null;
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
      !editor.hasNodes([CPContainerNode, CPTitleNode, CPChildContainerNode])
    ) {
      throw new Error(
        "CollapsibleParagraphPlugin: CPContainerNode, CPTitleNode, or CPChildContainerNode not registered on editor",
      );
    }

    return mergeRegister(
      // To send updates
      ...[CPTitleNode, CPChildContainerNode, TextNode, LineBreakNode].map(
        (Node) =>
          editor.registerMutationListener(
            Node,
            (mutations, { prevEditorState }) => {
              editor.update(() => {
                for (const [nodeKey, mutation] of mutations) {
                  const node = $getNodeByKey(nodeKey);
                  if (!node || mutation === "destroyed") {
                    prevEditorState.read(() => {
                      const prevNode = $getNodeByKey(nodeKey);
                      if (!prevNode) return;

                      const parentContainer = $findMatchingParent(
                        prevNode,
                        is_PARAGRAGRAPH,
                      ) as CPContainerNode;

                      const parentKey = parentContainer.getKey();
                      editor.update(() => {
                        $getNodeByKey(parentKey)?.markDirty();
                      });
                    });
                    continue;
                  }

                  const parentContainer = $findMatchingParent(
                    node,
                    is_PARAGRAGRAPH,
                  ) as CPContainerNode;

                  parentContainer?.markDirty();
                }
              });
            },
          ),
      ),
      editor.registerMutationListener(
        CPContainerNode,
        (mutations, { prevEditorState }) => {
          editor.getEditorState().read(() => {
            for (const [nodeKey, mutation] of mutations) {
              const node = $getNodeByKey<CPContainerNode>(nodeKey);

              if (!node || mutation === "destroyed") {
                prevEditorState.read(() => {
                  const prevNode = $getNodeByKey<CPContainerNode>(nodeKey);
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
