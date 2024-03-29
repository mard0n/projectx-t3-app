/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  KEY_DOWN_COMMAND,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
} from "lexical";
import { useEffect } from "react";
import { $getSelectedBlocks } from "../SelectBlocksPlugin";
import { $isBlockTextNode } from "~/nodes/BlockText";

const ShortcutsPlugin = ({}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // if (
    //   !editor.hasNodes([
    //     BlockContainerNode,
    //     BlockTextNode,
    //     BlockChildContainerNode,
    //   ])
    // ) {
    //   throw new Error(
    //     "ShortcutsPlugin: Some nodes are not registered on editor",
    //   );
    // }
    return mergeRegister(
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event: KeyboardEvent) => {
          console.log("KEY_DOWN_COMMAND", event);

          const selection = $getSelection();
          if (!selection || !$isRangeSelection(selection)) return false;

          const selectedBlocks = $getSelectedBlocks(selection);

          if (event.altKey) {
            switch (event.code) {
              case "Digit1":
                selectedBlocks.forEach((node) => {
                  if ($isBlockTextNode(node)) node.setTag("h1");
                });
                event.preventDefault();
                return true;
              case "Digit2":
                selectedBlocks.forEach((node) => {
                  if ($isBlockTextNode(node)) node.setTag("h2");
                });
                event.preventDefault();
                return true;
              case "Digit3":
                selectedBlocks.forEach((node) => {
                  if ($isBlockTextNode(node)) node.setTag("h3");
                });
                event.preventDefault();
                return true;
              case "Digit4":
                selectedBlocks.forEach((node) => {
                  if ($isBlockTextNode(node)) node.setTag("p");
                });
                event.preventDefault();
                return true;
              default:
                break;
            }
          }
          return false;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor]);

  return <></>;
};

export { ShortcutsPlugin };
