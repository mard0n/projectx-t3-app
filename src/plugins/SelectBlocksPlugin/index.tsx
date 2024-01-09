import React, { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_NORMAL,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import {
  $findParentBlockContainer,
  BlockChildContainerNode,
  BlockContainerNode,
  BlockTextNode,
} from "~/nodes/Block";
import { selectOnlyTopNotes } from "~/utils/lexical";
import { useSelectedBlocks } from "~/pages/notes";

const SelectBlocksPlugin = ({}) => {
  const [editor] = useLexicalComposerContext();
  const selectedBlocks = useSelectedBlocks((state) => state.selectedBlocks);
  const setSelectedBlocks = useSelectedBlocks(
    (state) => state.setSelectedBlocks,
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
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          selectedBlocks?.forEach((node) => node.setSelected(false));
          setSelectedBlocks(null);

          const selection = $getSelection();

          if (!$isRangeSelection(selection) || selection.isCollapsed()) {
            return false;
          }

          const selectedNodes = selection.getNodes();

          if (!selectedNodes.some((node) => !$isTextNode(node))) {
            // Don't add selected class if only one line is selected
            return false;
          }

          const cPContainers = [
            ...new Set(
              selectedNodes.flatMap((node) => {
                const result = $findParentBlockContainer(node);
                return !!result ? [result] : [];
              }),
            ),
          ];
          const onlyTopLevelNodes = selectOnlyTopNotes(cPContainers);

          setSelectedBlocks(onlyTopLevelNodes);

          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor, selectedBlocks]);

  useEffect(() => {
    editor.update(() => {
      selectedBlocks?.forEach((node) => node.setSelected(true));
    });
  }, [selectedBlocks]);

  return null;
};

export { SelectBlocksPlugin };
