import React, { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
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

const SelectBlocksPlugin = ({}) => {
  const [editor] = useLexicalComposerContext();

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
          const selection = $getSelection();

          // selectedBlocks.current?.forEach((node) => node.setSelected(false));

          // updateSelectedBlocks(null);

          if (!$isRangeSelection(selection)) {
            return false;
          }

          if (selection.isCollapsed()) {
            return false;
          }

          const selectedNodes = selection.getNodes();

          if (selectedNodes.length <= 1) {
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

          // updateSelectedBlocks(onlyTopLevelNodes);

          onlyTopLevelNodes.forEach((node) => node.setSelected(true));

          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor]);

  return null;
};

export { SelectBlocksPlugin };
