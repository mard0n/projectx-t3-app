/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
  KEY_DOWN_COMMAND,
} from "lexical";
import { useEffect } from "react";
import {
  $findParentBlockContainer,
  BlockChildContainerNode,
  BlockContainerNode,
  BlockTextNode,
} from "~/nodes/Block";
import {
  $createBlockHeaderNode,
  BlockHeaderNode,
  type HeaderTagType,
} from "~/nodes/BlockHeader";
import { useSelectedBlocks } from "~/pages/notes";

const ShortcutsPlugin = ({}) => {
  const [editor] = useLexicalComposerContext();
  const { selectedBlocks, setSelectedBlocks } = useSelectedBlocks();

  useEffect(() => {
    if (
      !editor.hasNodes([
        BlockContainerNode,
        BlockTextNode,
        BlockChildContainerNode,
        BlockHeaderNode,
      ])
    ) {
      throw new Error(
        "ShortcutsPlugin: BlockContainerNode, BlockTextNode, BlockChildContainerNode or BlockHeaderNode not registered on editor",
      );
    }

    return mergeRegister(
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event: KeyboardEvent) => {
          console.log("KEY_DOWN_COMMAND", event);
          const changeToHeaderType = (
            tagType: HeaderTagType,
            event: KeyboardEvent,
            selectedBlocks: BlockContainerNode[] | null,
          ) => {
            event.preventDefault();
            const selection = $getSelection();

            if (!$isRangeSelection(selection)) {
              return false;
            }

            const nodes = selection.getNodes();

            const containerNodes = [
              ...new Set(
                nodes.flatMap((node) => {
                  const result = $findParentBlockContainer(node);
                  return !!result ? [result] : [];
                }),
              ),
            ];

            const replacedBlocks = [];
            for (const blockContainerNode of containerNodes) {
              const newHeaderNode = $createBlockHeaderNode({
                tag: tagType,
                prepopulateChildren: false,
              });

              newHeaderNode.setOpen(blockContainerNode.getOpen());
              newHeaderNode.setSelected(blockContainerNode.getSelected());
              newHeaderNode.setDirection(blockContainerNode.getDirection());
              newHeaderNode.setIndent(blockContainerNode.getIndent());
              newHeaderNode.setFormat(blockContainerNode.getFormatType());

              blockContainerNode.replace(newHeaderNode, true);
              replacedBlocks.push(newHeaderNode);
            }

            if (selectedBlocks?.length && replacedBlocks.length) {
              setSelectedBlocks(replacedBlocks);
            }
          };

          if (event.altKey) {
            switch (event.code) {
              case "Digit1":
                changeToHeaderType("h1", event, selectedBlocks);
                break;
              case "Digit2":
                changeToHeaderType("h2", event, selectedBlocks);
                break;
              case "Digit3":
                changeToHeaderType("h3", event, selectedBlocks);
                break;
              case "Digit4":
                changeToHeaderType("h4", event, selectedBlocks);
                break;

              default:
                break;
            }
          }

          return false;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor, selectedBlocks]);

  return <></>;
};

export { ShortcutsPlugin };
