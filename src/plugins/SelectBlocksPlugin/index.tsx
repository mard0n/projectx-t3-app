import React, { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelectedBlocks,
  $isBlockContainerNode,
  BlockChildContainerNode,
  BlockContainerNode,
  BlockContentNode,
} from "~/nodes/Block";
import {
  SELECTION_CHANGE_COMMAND,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $getNodeByKey,
} from "lexical";

const SelectBlocksPlugin = ({}) => {
  const [editor] = useLexicalComposerContext();
  const prevSelectedBlocks = useRef<BlockContainerNode[] | null>(null);

  useEffect(() => {
    if (
      !editor.hasNodes([
        BlockContainerNode,
        BlockContentNode,
        BlockChildContainerNode,
      ])
    ) {
      throw new Error(
        "SelectBlocksPlugin: BlockContainerNode, BlockTextNode, or BlockChildContainerNode not registered on editor",
      );
    }

    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          console.log("SELECTION_CHANGE_COMMAND", prevSelectedBlocks.current);

          prevSelectedBlocks.current?.forEach((block) => {
            const isExistInEditor = $getNodeByKey(block.getKey());
            isExistInEditor &&
              $isBlockContainerNode(block) &&
              block.setSelected(false);
          });
          prevSelectedBlocks.current = null;

          const selection = $getSelection();

          if (!$isRangeSelection(selection) || selection.isCollapsed()) {
            return false;
          }

          const selectedNodes = $getSelectedBlocks(selection);

          // Don't add selected class if only one line is selected
          if (selectedNodes?.length < 2) {
            return false;
          }

          selectedNodes.forEach((block) => block.setSelected(true));

          prevSelectedBlocks.current = selectedNodes;

          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ENTER_COMMAND,
        (event) => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          const selectedBlocks = $getSelectedBlocks(selection);
          console.log("selectedBlocks", selectedBlocks);

          if (selectedBlocks?.length > 1) {
            event?.preventDefault();
            console.log("select lastnode");

            const lastNode = selectedBlocks.slice(-1)[0]; // TODO: Not the best method. They are not ordered any specific way
            console.log("lastNode", lastNode);

            lastNode?.selectEnd();
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<boolean>(
        DELETE_LINE_COMMAND,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }

          const selectedBlocks = $getSelectedBlocks(selection);

          if (selectedBlocks?.length > 1) {
            const prevBlock = selectedBlocks[0]?.getPreviousSibling();
            selectedBlocks.forEach((node) => node.remove());
            console.log("prevBlock", prevBlock);
            prevBlock ? prevBlock.selectEnd() : $setSelection(null);
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<boolean>(
        DELETE_CHARACTER_COMMAND,
        () => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          const selectedBlocks = $getSelectedBlocks(selection);
          if (selectedBlocks?.length > 1) {
            const prevBlock = selectedBlocks[0]?.getPreviousSibling();
            selectedBlocks.forEach((node) => node.remove());
            prevBlock ? prevBlock.selectEnd() : $setSelection(null);
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<InputEvent | string>(
        CONTROLLED_TEXT_INSERTION_COMMAND,
        () => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          const selectedBlocks = $getSelectedBlocks(selection);

          if (selectedBlocks?.length > 1) {
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor]);

  return null;
};

export { SelectBlocksPlugin };
