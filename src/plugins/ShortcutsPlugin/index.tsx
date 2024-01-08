/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { COMMAND_PRIORITY_NORMAL, KEY_DOWN_COMMAND } from "lexical";
import { useEffect } from "react";
import {
  BlockChildContainerNode,
  BlockContainerNode,
  BlockTextNode,
} from "~/nodes/Block";
import { BlockHeaderNode } from "~/nodes/BlockHeader";

const HeaderPlugin = ({}) => {
  const [editor] = useLexicalComposerContext();

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
        "HeaderPlugin: BlockContainerNode, BlockTextNode, BlockChildContainerNode or HeaderNode not registered on editor",
      );
    }

    return mergeRegister(
      editor.registerMutationListener(BlockContainerNode, () => null),
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event: KeyboardEvent) => {
          console.log("KEY_DOWN_COMMAND", event);
          // const changeToHeaderType = (
          //   tagType: HeaderTagType,
          //   event: KeyboardEvent,
          // ) => {
          //   const selection = $getSelection();

          //   if (!$isRangeSelection(selection)) {
          //     return false;
          //   }

          //   const nodes = selection.getNodes();

          //   const containerNodes = [
          //     ...new Set(
          //       nodes.flatMap((node) => {
          //         const result = $findParentBlockContainer(node);
          //         return !!result ? [result] : [];
          //       }),
          //     ),
          //   ];

          //   $customSetBlocksType(containerNodes, () =>
          //     $createHeaderNode({
          //       tag: tagType,
          //     }),
          //   );

          //   event.preventDefault();
          // };

          // if (event.altKey) {
          //   switch (event.code) {
          //     case "Digit1":
          //       changeToHeaderType("h1", event);
          //       break;
          //     case "Digit2":
          //       changeToHeaderType("h2", event);
          //       break;
          //     case "Digit3":
          //       changeToHeaderType("h3", event);
          //       break;
          //     case "Digit4":
          //       changeToHeaderType("h4", event);
          //       break;

          //     default:
          //       break;
          //   }
          // }

          return false;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor]);

  return <></>;
};

export { HeaderPlugin };
