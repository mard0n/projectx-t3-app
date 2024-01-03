/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useEffect, useState } from "react";

import {
  $createCPChildContainerNode,
  $isCPChildContainerNode,
  CPChildContainerNode,
} from "./CPChildContainer";
import {
  $createCPContainerNode,
  $isCPContainerNode,
  CPContainerNode,
} from "./CPContainer";
import { $createCPTitleNode, $isCPTitleNode, CPTitleNode } from "./CPTitle";
import type {
  BaseSelection,
  ElementNode,
  GridSelection,
  LexicalEditor,
  LexicalNode,
  RangeSelection,
  SerializedLexicalNode,
} from "lexical";
import type { FC } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $generateNodesFromSerializedNodes,
  $getHtmlContent,
  $getLexicalContent,
  $insertDataTransferForPlainText,
} from "@lexical/clipboard";
import { $generateNodesFromDOM } from "@lexical/html";
import type { LineBreakNode, TextNode } from "lexical";
import {
  ParagraphNode,
  COMMAND_PRIORITY_NORMAL,
  $isTextNode,
  DELETE_CHARACTER_COMMAND,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_ENTER_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  KEY_TAB_COMMAND,
  $getNodeByKey,
  $getRoot,
  COPY_COMMAND,
  $isNodeSelection,
  CUT_COMMAND,
  PASTE_COMMAND,
  $createTabNode,
  $isLineBreakNode,
  $isElementNode,
  $getSelection,
  $isRangeSelection,
  isSelectionWithinEditor,
} from "lexical";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import DraggableBlockPlugin from "./plugins/DraggableBlockPlugin";
import {
  SendingUpdatesPlugin,
  type Updates,
} from "./plugins/SendingUpdatesPlugin";
import { SelectBlocksPlugin } from "./plugins/SelectBlocksPlugin";
import { selectOnlyTopNotes } from "./utils";

export const is_PARAGRAGRAPH = (node: LexicalNode): node is CPContainerNode =>
  $isCPContainerNode(node);

interface CollapsibleParagraphPluginProps {
  anchorElem: HTMLElement;
  handleUpdates: (updates: Updates) => void;
}

const CollapsibleParagraphPlugin: FC<CollapsibleParagraphPluginProps> = ({
  anchorElem,
  handleUpdates,
}) => {
  const [editor] = useLexicalComposerContext();
  const [selectedBlocks, setSelectedBlocks] = useState<
    CPContainerNode[] | null
  >([]);

  useEffect(() => {
    if (
      !editor.hasNodes([CPContainerNode, CPTitleNode, CPChildContainerNode])
    ) {
      throw new Error(
        "CollapsibleParagraphPlugin: CPContainerNode, CPTitleNode, or CPChildContainerNode not registered on editor",
      );
    }

    return mergeRegister(
      // To make sure all the Editor is never empty
      editor.registerMutationListener(CPContainerNode, () => {
        editor.update(() => {
          if ($getRoot().isEmpty()) {
            const collapsible = $createCPContainerNode();
            $getRoot().append(collapsible);
            const firstDecendent = collapsible.getFirstDescendant();
            $isElementNode(firstDecendent) && firstDecendent.select();
          }
        });
      }),
      // To make sure all ParagraphNodes are replaced by CPContainerNode
      editor.registerMutationListener(ParagraphNode, (mutations) => {
        editor.update(() => {
          for (const [nodeKey, mutation] of mutations) {
            if (mutation === "created") {
              const paragraph = $getNodeByKey<ParagraphNode>(nodeKey);
              if (!paragraph) return;
              const textContent = paragraph.getChildren();
              const collapsible = $createCPContainerNode({
                titleNode: textContent,
              });
              paragraph.insertBefore(collapsible);
            }
          }
        });
      }),
      // To make sure there is always childContainer
      editor.registerNodeTransform(CPContainerNode, (node) => {
        const children = node.getChildren<LexicalNode>();
        if (children.length !== 2 || !$isCPChildContainerNode(children[1])) {
          const newChildContainerNode = $createCPChildContainerNode();
          node.append(newChildContainerNode);
        }
      }),
      // When title is deleted, upwrap the childContent into a sibling or parent or root
      editor.registerNodeTransform(CPContainerNode, (node) => {
        const containerNode = node;
        const childContainerNode = containerNode.getChildContainerNode();
        const titleNode = containerNode.getTitleNode();

        if (!childContainerNode) return;

        if (!titleNode) {
          const childContainerChildren =
            childContainerNode.getChildren<CPContainerNode>();
          const prevSiblingNode =
            containerNode.getPreviousSibling<CPContainerNode>();

          if (prevSiblingNode && $isCPContainerNode(prevSiblingNode)) {
            const prevSiblingChildContainerNode =
              prevSiblingNode.getChildContainerNode();

            // HACK: somehow when a sibling title of a node is getting deleted, the empty childContainer of the node is also getting deleted
            if (prevSiblingChildContainerNode) {
              prevSiblingChildContainerNode.append(...childContainerChildren);
              containerNode.remove();
              return;
            } else {
              const newChildContainerNode =
                $createCPChildContainerNode().append(...childContainerChildren);
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
      editor.registerCommand<boolean>(
        DELETE_CHARACTER_COMMAND,
        (isBackward) => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          if (selection.isCollapsed()) {
            const currentNode = selection.focus.getNode() as
              | ElementNode
              | TextNode;
            const titleNode = $findMatchingParent(
              currentNode,
              (node): node is CPTitleNode => $isCPTitleNode(node),
            );
            const containerNode = titleNode?.getParent<CPContainerNode>();

            const offset = selection.anchor.offset;
            const node = selection.anchor.getNode() as ElementNode | TextNode;

            const isSelectionAtTheEndOfText =
              $isTextNode(node) && node.getTextContentSize() === offset;

            if (
              $isCPTitleNode(titleNode) &&
              $isCPContainerNode(containerNode) &&
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
      editor.registerCommand<InputEvent | string>(
        CONTROLLED_TEXT_INSERTION_COMMAND,
        (eventOrText) => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
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

          if (insertedNode && $isCPTitleNode(insertedNode)) {
            const containerNode = insertedNode.getParentCPContainer();
            if (!containerNode) return false;

            const insertedNodeContent = insertedNode.getChildren();
            const newParagraph = $createCPContainerNode({
              titleNode: insertedNodeContent,
            });

            if (!containerNode.getOpen()) {
              containerNode.insertAfter(newParagraph);
              newParagraph.selectStart();
              insertedNode.remove();
              return true;
            }

            const childContainer = containerNode.getChildContainerNode();
            if (childContainer?.getChildren().length) {
              childContainer.getFirstChild()?.insertBefore(newParagraph);
              newParagraph.selectStart();
              insertedNode.remove();
              return true;
            }

            containerNode.insertAfter(newParagraph);
            newParagraph.selectStart();
            insertedNode.remove();
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

          const nodes = selection.getNodes();
          const paragraphs = [
            ...new Set(
              nodes
                .map((node) => {
                  const ancestor = $findMatchingParent(
                    node,
                    is_PARAGRAGRAPH,
                  ) as CPContainerNode | null;
                  return ancestor;
                })
                .filter((node) => !!node),
            ),
          ] as CPContainerNode[];

          const onlyTopLevelNodes = selectOnlyTopNotes(paragraphs);

          let commonPrevSibling: CPContainerNode | undefined;
          for (const node of onlyTopLevelNodes) {
            const prevNode = node.getPreviousSibling();

            if (!prevNode || !is_PARAGRAGRAPH(prevNode)) continue;

            if (
              !onlyTopLevelNodes.some(
                (node) => node.getKey() === prevNode.getKey(),
              )
            ) {
              commonPrevSibling = prevNode;
            }
          }

          if (!commonPrevSibling) return false;

          const childContainer = commonPrevSibling.getChildContainerNode();
          if (!childContainer) {
            const childContainerNode = $createCPChildContainerNode().append(
              ...onlyTopLevelNodes,
            );
            commonPrevSibling.append(childContainerNode);
            return false;
          }
          childContainer.append(...onlyTopLevelNodes);
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
          const nodes = selection.getNodes();

          // Whatever nodes you select, their parents will connect and will have common parent and siblings
          const paragraphs = [
            ...new Set(
              nodes
                .map((node) => {
                  const ancestor = $findMatchingParent(
                    node,
                    is_PARAGRAGRAPH,
                  ) as CPContainerNode | null;
                  return ancestor;
                })
                .filter((node) => !!node),
            ),
          ] as CPContainerNode[];

          let onlyTopLevelNodes = selectOnlyTopNotes(paragraphs);

          onlyTopLevelNodes = onlyTopLevelNodes.reverse(); // To work with insertAfter

          for (const paragraph of onlyTopLevelNodes) {
            const parentNode = paragraph.getParent<LexicalNode>();
            if (!parentNode) continue;
            const parentContainerNode = $findMatchingParent(
              parentNode,
              (node: LexicalNode): node is CPContainerNode =>
                $isCPContainerNode(node),
            );
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
      editor.registerCommand(
        COPY_COMMAND,
        (event) => {
          return copy(event, editor);
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        CUT_COMMAND,
        (event) => {
          copy(event, editor);

          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.removeText();
            } else if ($isNodeSelection(selection)) {
              selection.getNodes().forEach((node) => node.remove());
            }
          });
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;
          event.preventDefault();

          const clipboardData =
            event instanceof InputEvent || event instanceof KeyboardEvent
              ? null
              : event.clipboardData;
          console.log("clipboardData", clipboardData);

          if (clipboardData === null) return false;

          const lexicalString = clipboardData.getData(
            "application/x-lexical-editor",
          );

          if (lexicalString) {
            try {
              const payload = JSON.parse(lexicalString, (key, value) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return key !== "id" ? value : null; // To make sure on paste new ids are created
              }) as {
                namespace: string;
                nodes: SerializedLexicalNode[];
              };

              if (
                payload.namespace === editor._config.namespace &&
                Array.isArray(payload.nodes)
              ) {
                const nodes = $generateNodesFromSerializedNodes(
                  payload.nodes,
                ) as COPIABLE_NODES[];

                insertGeneratedNodes(editor, nodes, selection);
                return true;
              }
            } catch {
              // Fail silently.
            }
          }

          const htmlString = clipboardData.getData("text/html");
          if (htmlString) {
            try {
              const parser = new DOMParser();
              const dom = parser.parseFromString(htmlString, "text/html");
              const nodes = $generateNodesFromDOM(
                editor,
                dom,
              ) as COPIABLE_NODES[];
              insertGeneratedNodes(editor, nodes, selection);
              return true;
            } catch {
              // Fail silently.
            }
          }

          // Multi-line plain text in rich text mode pasted as separate paragraphs
          // instead of single paragraph with linebreaks.
          // Webkit-specific: Supports read 'text/uri-list' in clipboard.
          const text =
            clipboardData.getData("text/plain") ||
            clipboardData.getData("text/uri-list");
          console.log("text", text);

          if (text) {
            if ($isRangeSelection(selection)) {
              const parts = text.split(/(\r?\n|\t)/);
              if (parts[parts.length - 1] === "") {
                parts.pop();
              }
              for (const part of parts) {
                if (part === "\n" || part === "\r\n") {
                  const newContainer = $createCPContainerNode();
                  selection.insertNodes([newContainer]);
                  // selection.insertParagraph()
                } else if (part === "\t") {
                  selection.insertNodes([$createTabNode()]);
                } else {
                  selection.insertText(part);
                }
              }
            } else {
              (selection as BaseSelection).insertRawText(text);
            }
          }

          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor]);

  return (
    <>
      {anchorElem && (
        <DraggableBlockPlugin
          anchorElem={anchorElem}
          selectedBlocks={selectedBlocks!}
        />
      )}
      <SendingUpdatesPlugin handleUpdates={handleUpdates} />
      <SelectBlocksPlugin setSelectedBlocks={setSelectedBlocks} />
    </>
  );
};

type COPIABLE_NODES =
  | TextNode
  | LineBreakNode
  | CPContainerNode
  | CPTitleNode
  | CPChildContainerNode;

function insertGeneratedNodes(
  editor: LexicalEditor,
  nodes: COPIABLE_NODES[],
  selection: RangeSelection | GridSelection,
): void {
  const anchorContainer = $findMatchingParent(
    selection.anchor.getNode() as LexicalNode,
    is_PARAGRAGRAPH,
  )! as CPContainerNode;

  // TO set selection at the end
  const last = nodes[nodes.length - 1]!;
  const nodeToSelect = $isElementNode(last)
    ? last.getLastDescendant() ?? last
    : last;
  console.log("nodeToSelect", nodeToSelect);

  const nodeToSelectSize = nodeToSelect.getTextContentSize();

  let anchorNextSibling = null;
  // Wrap text and inline nodes in paragraph nodes so we have all blocks at the top-level
  for (const node of nodes) {
    if ($isLineBreakNode(node) || $isTextNode(node)) {
      anchorContainer.getTitleNode()?.append(node);
    } else if ($isCPContainerNode(node)) {
      if (!anchorNextSibling) {
        anchorContainer.insertAfter(node);
      } else {
        anchorNextSibling.insertAfter(node);
      }
      anchorNextSibling = node;
    } else if ($isCPTitleNode(node)) {
      anchorContainer.getTitleNode()?.append(...node.getChildren());
    } else if ($isCPChildContainerNode(node)) {
      anchorContainer.getChildContainerNode()?.append(...node.getChildren());
    }
  }

  if ($isElementNode(nodeToSelect)) {
    nodeToSelect.select(nodeToSelectSize, nodeToSelectSize);
  } else {
    nodeToSelect.selectNext(0, 0);
  }

  return;
}

function copy(
  event: KeyboardEvent | ClipboardEvent | null,
  editor: LexicalEditor,
) {
  if (!event) return false;
  event.preventDefault();

  const clipboardData =
    event instanceof InputEvent || event instanceof KeyboardEvent
      ? null
      : event.clipboardData;

  if (clipboardData === null) return false;

  const domSelection = editor._window?.getSelection();
  if (!domSelection) {
    return false;
  }
  const anchorDOM = domSelection.anchorNode;
  const focusDOM = domSelection.focusNode;
  if (
    anchorDOM !== null &&
    focusDOM !== null &&
    !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
  ) {
    return false;
  }

  const selection = $getSelection();
  if (selection === null) {
    return false;
  }

  const htmlString = $getHtmlContent(editor);
  clipboardData.setData("text/html", htmlString);

  const lexicalString = $getLexicalContent(editor);
  if (lexicalString !== null) {
    clipboardData.setData("application/x-lexical-editor", lexicalString);
  }

  const plainString = selection.getTextContent();
  clipboardData.setData("text/plain", plainString);

  return true;
}

export { CollapsibleParagraphPlugin };
export { $createCPContainerNode, $isCPContainerNode, CPContainerNode };
export { $createCPTitleNode, $isCPTitleNode, CPTitleNode };
export {
  $createCPChildContainerNode,
  $isCPChildContainerNode,
  CPChildContainerNode,
};
