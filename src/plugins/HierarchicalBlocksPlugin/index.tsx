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
  TextFormatType,
  SerializedLexicalNode,
  LineBreakNode,
  LexicalEditor,
  PasteCommandType,
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
  COPY_COMMAND,
  CUT_COMMAND,
  PASTE_COMMAND,
  $isElementNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  DELETE_LINE_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  $getRoot,
  $setSelection,
  $isNodeSelection,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import {
  BlockContainerNode,
  BlockContentNode,
  BlockChildContainerNode,
  $createBlockChildContainerNode,
  $isBlockContainerNode,
  $isBlockContentNode,
  $isBlockChildContainerNode,
} from "~/nodes/Block";
import { $findParentBlockContainer } from "~/nodes/Block";
import {
  $convertSelectionIntoHTMLContent,
  $convertSelectionIntoLexicalContent,
  $customInsertGeneratedNodes,
} from "~/utils/lexical/clipboard";
import { $createBlockTextNode, BlockTextNode } from "~/nodes/BlockText";
import { BlockHighlightNode } from "~/nodes/BlockHighlight";
import { BlockLinkNode } from "~/nodes/BlockLink";
import {
  $createBlockNoteNode,
  BlockNoteNode,
} from "~/nodes/BlockNote/BlockNote";
import { $getSelectedBlocks } from "../SelectBlocksPlugin";

const HierarchicalBlockPlugin = ({}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (
      !editor.hasNodes([
        BlockContainerNode,
        BlockContentNode,
        BlockChildContainerNode,
        BlockTextNode,
        BlockHighlightNode,
        BlockLinkNode,
      ])
    ) {
      throw new Error(
        "HierarchicalBlockPlugin: Some nodes are not registered on editor",
      );
    }

    return mergeRegister(
      // To make sure there is no empty BlockNote
      editor.registerNodeTransform(BlockNoteNode, (node) => {
        const children = node.getChildren();

        if (!children.length) {
          node.remove();
        }
      }),
      ...[
        BlockContainerNode,
        BlockHighlightNode,
        BlockTextNode,
        BlockLinkNode,
      ].map((BlockNode) => {
        return mergeRegister(
          // To make sure the Editor is never empty
          editor.registerMutationListener(BlockNode, () => {
            editor.update(() => {
              if ($getRoot().isEmpty()) {
                const containerNode = $createBlockTextNode({ tag: "p" });
                $getRoot().append(containerNode);
                const firstDecendent = containerNode.getFirstDescendant();
                $isElementNode(firstDecendent) && firstDecendent.select();
              }
            });
          }),
          // To make sure BlockNode is always inside BlockNote
          editor.registerNodeTransform(BlockNode, (node) => {
            const parentNode = node.getParentContainer();
            if (!parentNode) {
              const newChildContainerNode = $createBlockNoteNode();
              node.insertAfter(newChildContainerNode);
              newChildContainerNode.append(node);
            }
          }),
          // To make sure there is always childContainer
          editor.registerNodeTransform(BlockNode, (node) => {
            const children = node.getChildren();
            const blockChildContainer = children.find((node) =>
              $isBlockChildContainerNode(node),
            );
            if (!blockChildContainer) {
              const newChildContainerNode = $createBlockChildContainerNode();
              node.append(newChildContainerNode);
            }
          }),
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

            const newTextBlock = $createBlockTextNode({
              tag: "p",
              contentChildren: contentTexts,
            });
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
            const parentContainerNode = paragraph.getParentContainer();
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
          copy(event, editor);
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        CUT_COMMAND,
        (event) => {
          if (!event) return false;
          event.preventDefault();
          cut(event, editor);
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          if (!event) return false;
          event.preventDefault();
          paste(event, editor);
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor]);

  return <></>;
};

const copy = (event: ClipboardEvent | KeyboardEvent, editor: LexicalEditor) => {
  const clipboardData =
    event instanceof InputEvent || event instanceof KeyboardEvent
      ? null
      : event.clipboardData;

  if (clipboardData === null) return false;

  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;

  const lexicalString = $convertSelectionIntoLexicalContent(selection, editor);
  if (lexicalString !== null) {
    clipboardData.setData("application/x-lexical-editor", lexicalString);
  }

  const htmlString = $convertSelectionIntoHTMLContent(selection, editor);
  if (htmlString !== null) {
    clipboardData.setData("text/html", htmlString);
  }
  const plainString = selection.getTextContent();
  clipboardData.setData("text/plain", plainString);
};

const cut = (event: ClipboardEvent | KeyboardEvent, editor: LexicalEditor) => {
  copy(event, editor);

  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const selectedBlocks = $getSelectedBlocks(selection);
      if (selectedBlocks?.length > 1) {
        selectedBlocks.forEach((node) => node.remove());
        $setSelection(null);
        return;
      }
      selection.removeText();
    } else if ($isNodeSelection(selection)) {
      selection.getNodes().forEach((node) => node.remove());
    }
  });
};

const paste = (event: PasteCommandType, editor: LexicalEditor) => {
  // TODO: Revise the copy and paste.
  const selection = $getSelection();

  if (!selection || !$isRangeSelection(selection)) return;

  event.preventDefault();

  const clipboardData =
    event instanceof InputEvent || event instanceof KeyboardEvent
      ? null
      : event.clipboardData;

  if (clipboardData === null) return false;

  const lexicalString = clipboardData.getData("application/x-lexical-editor");
  if (lexicalString) {
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

    if (
      payload?.namespace === editor._config.namespace &&
      Array.isArray(payload?.nodes)
    ) {
      const nodes = $generateNodesFromSerializedNodes(payload?.nodes);
      return $customInsertGeneratedNodes(nodes, selection);
    }
  }

  // TODO Handle the pasting with style and html better from external websites
  // const htmlString = clipboardData.getData("text/html");
  // console.log("htmlString", htmlString);

  // if (htmlString) {
  //   try {
  //     const parser = new DOMParser();
  //     const dom = parser.parseFromString(htmlString, "text/html");
  //     const nodes = $generateNodesFromDOM(editor, dom);
  //     console.log("nodes", nodes);
  //     return true;
  //     // return customInsertGeneratedNodes(nodes, selection);
  //   } catch {
  //     // Fail silently.
  //   }
  // }

  // Multi-line plain text in rich text mode pasted as separate paragraphs
  // instead of single paragraph with linebreaks.
  // Webkit-specific: Supports read 'text/uri-list' in clipboard.
  const text =
    clipboardData.getData("text/plain") ||
    clipboardData.getData("text/uri-list");
  if (text != null) {
    if ($isRangeSelection(selection)) {
      // const parts = text.split(/(\r?\n)/);
      // if (parts[parts.length - 1] === "") {
      //   parts.pop();
      // }
      // for (const part of parts) {
      //   if (part === "\n" || part === "\r\n") {
      //     selection.insertParagraph();
      //   } else if (part === "\t") {
      //     selection.insertNodes([$createTabNode()]);
      //   } else {
      //     selection.insertText(part);
      //   } else {
      //     selection.insertRawText(text);
      //   }
      // }
      selection.insertText(text);
    }
  }
};

export { HierarchicalBlockPlugin };
