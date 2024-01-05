import React, { type FC, useEffect, type MutableRefObject } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { BlockTextNode, BlockChildContainerNode, BlockContainerNode } from "..";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { selectOnlyTopNotes } from "../utils";
import { $findParentCPContainer } from "../BlockContainer";

interface SelectBlocksPluginProps {
  selectedBlocks: MutableRefObject<BlockContainerNode[] | null>;
  updateSelectedBlocks: (blocks: BlockContainerNode[] | null) => void;
}

const SelectBlocksPlugin: FC<SelectBlocksPluginProps> = ({
  selectedBlocks,
  updateSelectedBlocks,
}) => {
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

          selectedBlocks.current?.forEach((node) => node.setSelected(false));

          updateSelectedBlocks(null);

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
                const result = $findParentCPContainer(node);
                return !!result ? [result] : [];
              }),
            ),
          ];

          const onlyTopLevelNodes = selectOnlyTopNotes(cPContainers);

          updateSelectedBlocks(onlyTopLevelNodes);

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
