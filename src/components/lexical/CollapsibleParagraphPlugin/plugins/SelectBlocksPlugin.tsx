import React, {
  type FC,
  type SetStateAction,
  type Dispatch,
  useEffect,
  useRef,
} from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
  CPTitleNode,
  CPChildContainerNode,
  CPContainerNode,
  is_PARAGRAGRAPH,
} from "..";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { selectOnlyTopNotes } from "../utils";

interface SelectBlocksPluginProps {
  setSelectedBlocks: Dispatch<SetStateAction<CPContainerNode[] | null>>;
}

const SelectBlocksPlugin: FC<SelectBlocksPluginProps> = ({
  setSelectedBlocks,
}) => {
  const [editor] = useLexicalComposerContext();
  const selectedElements = useRef<HTMLElement[]>([]);

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

          selectedElements.current.forEach((elem) =>
            elem.classList.remove("selected"),
          );
          setSelectedBlocks(null);

          if (!$isRangeSelection(selection)) {
            return false;
          }

          if (selection.isCollapsed()) {
            return false;
          }

          const selectedNodes = selection.getNodes();

          const cPContainers = [
            ...new Set(
              selectedNodes
                .map((node) => {
                  return $findMatchingParent(node, is_PARAGRAGRAPH);
                })
                .filter(Boolean) as CPContainerNode[],
            ),
          ];

          const onlyTopLevelNodes = selectOnlyTopNotes(cPContainers);

          if (onlyTopLevelNodes.length <= 1) {
            // Don't add selected class if only one line is selected
            return false;
          }

          const selectedElement = onlyTopLevelNodes
            .map((node) => editor.getElementByKey(node.getKey()))
            .filter(Boolean) as HTMLElement[];

          selectedElement.forEach((elem) => elem?.classList.add("selected"));

          selectedElements.current.push(...selectedElement);
          setSelectedBlocks(onlyTopLevelNodes);

          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor]);

  return null;
};

export { SelectBlocksPlugin };
