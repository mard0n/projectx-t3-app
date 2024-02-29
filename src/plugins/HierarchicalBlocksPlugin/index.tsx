/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $generateNodesFromSerializedNodes,
  $insertDataTransferForPlainText,
} from "@lexical/clipboard";
import type {
  TextNode,
  ElementNode,
  LexicalNode,
  TextFormatType,
  SerializedLexicalNode,
  LineBreakNode,
} from "lexical";
import {
  COMMAND_PRIORITY_NORMAL,
  $isTextNode,
  DELETE_CHARACTER_COMMAND,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_ENTER_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  KEY_TAB_COMMAND,
  $getRoot,
  COPY_COMMAND,
  CUT_COMMAND,
  PASTE_COMMAND,
  $isElementNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  DELETE_LINE_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
} from "lexical";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
  BlockContainerNode,
  BlockContentNode,
  BlockChildContainerNode,
  $isBlockChildContainerNode,
  $createBlockChildContainerNode,
  $isBlockContainerNode,
  $isBlockContentNode,
  $getSelectedBlocks,
} from "~/nodes/Block";
import { $findParentBlockContainer } from "~/nodes/Block";
import { $convertSelectionIntoLexicalContent } from "~/utils/lexical/extractSelectedText";
import { $createBlockTextNode, BlockTextNode } from "~/nodes/BlockText";

const HierarchicalBlockPlugin = ({}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (
      !editor.hasNodes([
        BlockContainerNode,
        BlockContentNode,
        BlockChildContainerNode,
      ])
    ) {
      throw new Error(
        "HierarchicalBlockPlugin: Some nodes are not registered on editor",
      );
    }

    return mergeRegister(
      ...[BlockContainerNode, BlockTextNode].map((BlockNode) => {
        return mergeRegister(
          // To make sure the Editor is never empty
          editor.registerMutationListener(BlockNode, () => {
            editor.update(() => {
              if ($getRoot().isEmpty()) {
                const containerNode = $createBlockTextNode("p");
                $getRoot().append(containerNode);
                const firstDecendent = containerNode.getFirstDescendant();
                $isElementNode(firstDecendent) && firstDecendent.select();
              }
            });
          }),
          // To make sure there is always childContainer
          editor.registerNodeTransform(BlockNode, (node) => {
            const children = node.getChildren<LexicalNode>();
            const blockChildContainer = children.find((node) =>
              $isBlockChildContainerNode(node),
            );
            if (!blockChildContainer) {
              const newChildContainerNode = $createBlockChildContainerNode();
              node.append(newChildContainerNode);
            }
          }),
          // // To make sure that blockContent contains an element not direct text
          // editor.registerNodeTransform(BlockNode, (node) => {
          //   const children = node.getChildren<LexicalNode>();
          //   const blockContent = children.find((node) =>
          //     $isBlockContentNode(node),
          //   );
          //   if (
          //     blockContent &&
          //     $isBlockContentNode(blockContent) &&
          //     !blockContent.getChildren().length
          //   ) {
          //     const newContentNode = $createParagraphNode();
          //     blockContent.append(newContentNode);
          //     node.append(blockContent);
          //   }
          // }),
          // When title is deleted, upwrap the childContent into a sibling or parent or root
          editor.registerNodeTransform(BlockNode, (node) => {
            const containerNode = node;
            const childContainerNode =
              containerNode.getBlockChildContainerNode();
            const titleNode = containerNode.getBlockContentNode();

            if (!childContainerNode) return;

            if (!titleNode) {
              const childContainerChildren =
                childContainerNode.getChildren<BlockContainerNode>();
              const prevSiblingNode =
                containerNode.getPreviousSibling<BlockContainerNode>();

              if (prevSiblingNode && $isBlockContainerNode(prevSiblingNode)) {
                const prevSiblingChildContainerNode =
                  prevSiblingNode.getBlockChildContainerNode();

                // HACK: somehow when a sibling title of a node is getting deleted, the empty childContainer of the node is also getting deleted
                if (prevSiblingChildContainerNode) {
                  prevSiblingChildContainerNode.append(
                    ...childContainerChildren,
                  );
                  containerNode.remove();
                  return;
                } else {
                  const newChildContainerNode =
                    $createBlockChildContainerNode().append(
                      ...childContainerChildren,
                    );
                  prevSiblingNode.append(newChildContainerNode);
                  containerNode.remove();
                  return;
                }
              }

              const parentNode = containerNode.getParent<ElementNode>();
              if (parentNode) {
                childContainerChildren.forEach((node) =>
                  containerNode.insertBefore(node),
                );
                containerNode.remove();
                return;
              }

              if (childContainerChildren.length) {
                $getRoot().append(...childContainerChildren);
                containerNode.remove();
                return;
              }
            }
          }),
        );
      }),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ENTER_COMMAND,
        (event) => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          if (event !== null) {
            // If we have beforeinput, then we can avoid blocking
            // the default behavior. This ensures that the iOS can
            // intercept that we're actually inserting a paragraph,
            // and autocomplete, autocapitalize etc work as intended.
            // This can also cause a strange performance issue in
            // Safari, where there is a noticeable pause due to
            // preventing the key down of enter.
            // if (
            //   (IS_IOS || IS_SAFARI || IS_APPLE_WEBKIT) &&
            //   CAN_USE_BEFORE_INPUT
            // ) {
            //   return false;
            // }

            event.preventDefault();
            if (event.shiftKey) {
              return editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
            }
          }

          const insertedNode = selection.insertParagraph();

          if (insertedNode && $isElementNode(insertedNode)) {
            const containerNode = $findParentBlockContainer(insertedNode);
            if (!$isBlockContainerNode(containerNode)) return false;
            const contentTexts = insertedNode.getChildren<
              TextNode | LineBreakNode
            >(); // TODO: Do proper type check

            const newTextBlock = $createBlockTextNode("p", contentTexts);
            insertedNode.remove();

            if (!containerNode?.getOpen()) {
              containerNode.insertAfter(newTextBlock);
              newTextBlock.selectStart();
              return true;
            }

            const childContainer = containerNode.getBlockChildContainerNode();
            if (childContainer?.getChildren().length) {
              const firstChild = childContainer.getChildren()[0];
              firstChild?.insertBefore(newTextBlock);
              newTextBlock.selectStart();
              return true;
            }

            containerNode.insertAfter(newTextBlock);
            newTextBlock.selectStart();
          }
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        INDENT_CONTENT_COMMAND,
        () => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          const selectedBlocks = $getSelectedBlocks(selection);

          let commonPrevSibling: BlockContainerNode | undefined;
          for (const node of selectedBlocks) {
            const prevNode = node.getPreviousSibling();

            if (!prevNode || !$isBlockContainerNode(prevNode)) continue;

            if (
              !selectedBlocks.some(
                (node) => node.getKey() === prevNode.getKey(),
              )
            ) {
              commonPrevSibling = prevNode;
            }
          }

          if (!commonPrevSibling) return false;

          const childContainer = commonPrevSibling.getBlockChildContainerNode();
          if (!childContainer) {
            const childContainerNode = $createBlockChildContainerNode().append(
              ...selectedBlocks,
            );
            commonPrevSibling.append(childContainerNode);
            return false;
          }
          childContainer.append(...selectedBlocks);
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        OUTDENT_CONTENT_COMMAND,
        () => {
          console.log("OUTDENT_CONTENT_COMMAND");

          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }

          const selectedBlocks = $getSelectedBlocks(selection).reverse(); // To work with insertAfter

          for (const paragraph of selectedBlocks) {
            const parentContainerNode = paragraph.getParentCPContainer();
            parentContainerNode?.insertAfter(paragraph);
          }
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event: KeyboardEvent) => {
          // console.log('KEY_TAB_COMMAND');
          event.preventDefault();
          if (!event.shiftKey) {
            return editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
          } else {
            return editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
          }
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand<boolean>(
        DELETE_LINE_COMMAND,
        (isBackward) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }

          selection.deleteLine(isBackward);

          // TODO: When you delete the whole line, don't delete the whole line and jump to the prev line
          // but stop at the beginning of the line you're deleting
          // const textNode = selection.focus.getNode() as TextNode | ElementNode;
          // const blockContainer = $findParentBlockContainer(textNode);

          // if (!blockContainer?.getBlockContentNode().getChildren().length) {
          //   editor.dispatchCommand(DELETE_CHARACTER_COMMAND, isBackward);
          // } else {

          //   // if text is the whole line it deletes the parent as well. which we don't want
          //   const blockContentNode = blockContainer?.getBlockContentNode();
          //   if (!blockContentNode) {
          //     const newBlockTextNode = $createBlockContentNode();
          //     blockContainer
          //       ?.getChildAtIndex(0)
          //       ?.insertBefore(newBlockTextNode);
          //     newBlockTextNode.selectEnd();
          //   }

          //   // TODO: Fix. When the first line of a text is deleted and there are still texts after that it moves the whole text into prev block
          // }
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand<boolean>(
        DELETE_CHARACTER_COMMAND,
        (isBackward) => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          if (selection.isCollapsed()) {
            // To prevent deleting when CPContainer is closed and cursor is at the end
            const currentNode = selection.focus.getNode() as
              | ElementNode
              | TextNode;

            const containerNode = $findParentBlockContainer(currentNode);
            const titleNode = containerNode?.getBlockContentNode();

            const offset = selection.anchor.offset;
            const node = selection.anchor.getNode() as ElementNode | TextNode;

            const isSelectionAtTheEndOfText =
              $isTextNode(node) && node.getTextContentSize() === offset;

            if (
              $isBlockContentNode(titleNode) &&
              $isBlockContainerNode(containerNode) &&
              !containerNode.getOpen() &&
              !isBackward &&
              isSelectionAtTheEndOfText
            ) {
              return true;
            }
          }

          selection.deleteCharacter(isBackward);
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand<TextFormatType>(
        FORMAT_TEXT_COMMAND,
        (format) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }
          selection.formatText(format);
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand<InputEvent | string>(
        CONTROLLED_TEXT_INSERTION_COMMAND,
        (eventOrText) => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          const selectedBlocks = $getSelectedBlocks(selection);

          if (selectedBlocks?.length > 1) {
            return true;
          }

          if (typeof eventOrText === "string") {
            selection.insertText(eventOrText);
          } else {
            const dataTransfer = eventOrText.dataTransfer;

            if (dataTransfer != null) {
              $insertDataTransferForPlainText(dataTransfer, selection);
            } else {
              const data = eventOrText.data;

              if (data) {
                selection.insertText(data);
              }
            }
          }

          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        COPY_COMMAND,
        (event) => {
          if (!event) return false;
          event.preventDefault();

          const clipboardData =
            event instanceof InputEvent || event instanceof KeyboardEvent
              ? null
              : event.clipboardData;

          if (clipboardData === null) return false;

          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;

          const lexicalString = $convertSelectionIntoLexicalContent(
            selection,
            editor,
          );
          console.log("lexicalString", lexicalString);

          if (lexicalString !== null) {
            clipboardData.setData(
              "application/x-lexical-editor",
              lexicalString,
            );
          }

          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        CUT_COMMAND,
        (event) => {
          // copy(event, editor, selectedBlocks);

          // editor.update(() => {
          //   const selection = $getSelection();
          //   if (selectedBlocks?.length) {
          //     selectedBlocks.forEach((node) => node.remove());
          //     setSelectedBlocks(null);
          //     return;
          //   }
          //   if ($isRangeSelection(selection)) {
          //     selection.removeText();
          //   } else if ($isNodeSelection(selection)) {
          //     selection.getNodes().forEach((node) => node.remove());
          //   }
          // });
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          // TODO: Revise the copy and paste.
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) return false;

          event.preventDefault();

          const clipboardData =
            event instanceof InputEvent || event instanceof KeyboardEvent
              ? null
              : event.clipboardData;

          if (clipboardData === null) return false;

          const lexicalString = clipboardData.getData(
            "application/x-lexical-editor",
          );
          console.log("paste lexicalString", lexicalString);

          if (!lexicalString) return true;

          let payload: {
            namespace: string;
            nodes: SerializedLexicalNode[];
          } | null = null;

          try {
            payload = JSON.parse(lexicalString, (key, value) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return key !== "id" ? value : null; // To make sure on paste new ids are created
            }) as {
              namespace: string;
              nodes: SerializedLexicalNode[];
            };
          } catch {
            // Fail silently.
            return true;
          }
          console.log("editor._config.namespace", editor._config.namespace);

          if (
            payload?.namespace === editor._config.namespace &&
            Array.isArray(payload?.nodes)
          ) {
            const nodes = $generateNodesFromSerializedNodes(payload?.nodes);
            console.log("paste nodes", nodes);

            function findFocusableNode(node: BlockContainerNode | ElementNode) {
              let nodeToFocus = null;
              if ($isBlockContainerNode(node)) {
                nodeToFocus = node.getBlockContentNode().getLastDescendant()!;
              } else {
                nodeToFocus = node.getLastDescendant()!;
              }

              return nodeToFocus as ElementNode | TextNode;
            }

            let nextFocusNode = selection.anchor.getNode() as
              | TextNode
              | ElementNode;

            for (const pasteNode of nodes) {
              const nextFocusContainer =
                $findParentBlockContainer(nextFocusNode);

              if (!nextFocusContainer) return false;

              if (
                $isBlockContainerNode(pasteNode) &&
                $isBlockContainerNode(nextFocusContainer) &&
                !nextFocusContainer
                  .getBlockContentNode()
                  .getTextContentSize() &&
                !nextFocusContainer.getBlockChildContainerNode().getChildren()
                  .length
              ) {
                nextFocusContainer.insertAfter(pasteNode);
                nextFocusContainer.remove();
                nextFocusNode = findFocusableNode(pasteNode);
                continue;
              }

              if ($isBlockContainerNode(pasteNode)) {
                // Special case
                if (
                  !nextFocusContainer.getBlockContentNode().getChildrenSize() &&
                  !pasteNode.getBlockChildContainerNode().getChildren().length
                ) {
                  const focusContent = nextFocusContainer.getBlockContentNode();
                  const pasteContent = pasteNode.getBlockContentNode();
                  focusContent.insertAfter(pasteContent);
                  focusContent.remove();
                  nextFocusNode = findFocusableNode(pasteNode);
                  continue;
                }

                nextFocusContainer.insertAfter(pasteNode);
                nextFocusNode = findFocusableNode(pasteNode);
              } else if ($isElementNode(pasteNode)) {
                const focusElementNode = $findMatchingParent(
                  nextFocusNode,
                  (node): node is ElementNode =>
                    $isElementNode(node) && !$isBlockContentNode(node),
                );
                focusElementNode?.insertAfter(pasteNode);
                nextFocusNode = pasteNode;
                if (!focusElementNode?.getTextContentSize()) {
                  focusElementNode?.remove();
                }
              } else if ($isTextNode(pasteNode)) {
                if ($isElementNode(nextFocusNode)) {
                  nextFocusNode.append(pasteNode);
                  nextFocusNode = pasteNode;
                } else if ($isTextNode(nextFocusNode)) {
                  nextFocusNode.insertAfter(pasteNode);
                  nextFocusNode = pasteNode;
                }
              } else {
                console.error("no appropriate place to paste");
              }
            }
            nextFocusNode.selectEnd();
            return true;
          }

          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor]);

  return <></>;
};

export { HierarchicalBlockPlugin };
