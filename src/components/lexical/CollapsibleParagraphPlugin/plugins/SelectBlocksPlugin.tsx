import React, { type FC, useEffect, type MutableRefObject } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  CPTitleNode,
  CPChildContainerNode,
  CPContainerNode,
} from "..";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { selectOnlyTopNotes } from "../utils";
import { $findParentCPContainer } from "../CPContainer";

interface SelectBlocksPluginProps {
  selectedBlocks: MutableRefObject<CPContainerNode[] | null>;
  updateSelectedBlocks: (blocks: CPContainerNode[] | null) => void;
}

const SelectBlocksPlugin: FC<SelectBlocksPluginProps> = ({
  selectedBlocks,
  updateSelectedBlocks,
}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (
      !editor.hasNodes([CPContainerNode, CPTitleNode, CPChildContainerNode])
    ) {
      throw new Error(
        "CollapsibleParagraphPlugin: CPContainerNode, CPTitleNode, or CPChildContainerNode not registered on editor",
      );
    }

    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          const selection = $getSelection();

          selectedBlocks.current?.forEach((node) => {
            const elem = editor.getElementByKey(node.getKey());
            if (elem) {
              return elem.classList.remove("selected");
            }
            return;
          });

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

          const selectedElement = onlyTopLevelNodes
            .map((node) => editor.getElementByKey(node.getKey()))
            .filter(Boolean) as HTMLElement[];

          selectedElement.forEach((elem) => elem?.classList.add("selected"));

          updateSelectedBlocks(onlyTopLevelNodes);

          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor]);

  return null;
};

export { SelectBlocksPlugin };
