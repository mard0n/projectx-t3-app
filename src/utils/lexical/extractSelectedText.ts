/* eslint-disable @typescript-eslint/prefer-for-of */
import type { BaseSerializedNode } from "@lexical/clipboard/clipboard";
import type {
  RangeSelection,
  TextNode,
  LexicalNode,
  ElementNode,
  SerializedTextNode,
  SerializedElementNode,
  SerializedLexicalNode,
  LexicalEditor,
} from "lexical";
import {
  $isElementNode,
  $isTextNode,
  $isRangeSelection,
  isSelectionWithinEditor,
} from "lexical";
import { selectOnlyTopNodes } from ".";
import { $isBlockContainerNode, type BlockContainerNode } from "~/nodes/Block";

function $sliceSelectedTextNodeContent(
  selection: RangeSelection,
  textNode: TextNode,
): LexicalNode {
  if (
    textNode.isSelected() &&
    !textNode.isSegmented() &&
    !textNode.isToken() &&
    $isRangeSelection(selection)
  ) {
    const anchorNode = selection.anchor.getNode() as TextNode | ElementNode;
    const focusNode = selection.focus.getNode() as TextNode | ElementNode;
    const isAnchor = textNode.is(anchorNode);
    const isFocus = textNode.is(focusNode);

    if (isAnchor || isFocus) {
      const isBackward = selection.isBackward();
      const [anchorOffset, focusOffset] = selection.getCharacterOffsets();
      const isSame = anchorNode.is(focusNode);
      const isFirst = textNode.is(isBackward ? focusNode : anchorNode);
      const isLast = textNode.is(isBackward ? anchorNode : focusNode);
      let startOffset = 0;
      let endOffset = undefined;

      if (isSame) {
        startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
        endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
      } else if (isFirst) {
        const offset = isBackward ? focusOffset : anchorOffset;
        startOffset = offset;
        endOffset = undefined;
      } else if (isLast) {
        const offset = isBackward ? anchorOffset : focusOffset;
        startOffset = 0;
        endOffset = offset;
      }

      const selectedPart = textNode.__text.slice(startOffset, endOffset);
      textNode.__text = selectedPart;
      return textNode;
    }
  }
  return textNode;
}

function $updateElementNodeProperties<T extends ElementNode>(
  target: T,
  source: ElementNode,
): T {
  target.__first = source.__first;
  target.__last = source.__last;
  target.__size = source.__size;
  target.__format = source.__format;
  target.__indent = source.__indent;
  target.__dir = source.__dir;
  return target;
}

function $updateTextNodeProperties<T extends TextNode>(
  target: T,
  source: TextNode,
): T {
  target.__format = source.__format;
  target.__style = source.__style;
  target.__mode = source.__mode;
  target.__detail = source.__detail;
  return target;
}

function $cloneWithProperties<T extends LexicalNode>(node: T): T {
  const constructor = node.constructor;
  // @ts-expect-error Lexical team said so
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const clone: T = constructor.clone(node);
  clone.__parent = node.__parent;
  clone.__next = node.__next;
  clone.__prev = node.__prev;

  if ($isElementNode(node) && $isElementNode(clone)) {
    return $updateElementNodeProperties(clone, node);
  }

  if ($isTextNode(node) && $isTextNode(clone)) {
    return $updateTextNodeProperties(clone, node);
  }

  return clone;
}

function $serializeTheNode(target: LexicalNode) {
  const serializedNode = target.exportJSON() as
    | SerializedElementNode
    | SerializedLexicalNode;

  // TODO: TextNode calls getTextContent() (NOT node.__text) within it's exportJSON method
  // which uses getLatest() to get the text from the original node with the same key.
  // This is a deeper issue with the word "clone" here, it's still a reference to the
  // same node as far as the LexicalEditor is concerned since it shares a key.
  // We need a way to create a clone of a Node in memory with it's own key, but
  // until then this hack will work for the selected text extract use case.
  if ($isTextNode(target)) {
    const text = target.__text;
    // If an uncollapsed selection ends or starts at the end of a line of specialized,
    // TextNodes, such as code tokens, we will get a 'blank' TextNode here, i.e., one
    // with text of length 0. We don't want this, it makes a confusing mess. Reset!
    if (text.length > 0) {
      (serializedNode as SerializedTextNode).text = text;
    }
  }
  return serializedNode;
}

function $cloneAndSliceAndSerializeTheNode(
  currentNode: LexicalNode,
  selection: RangeSelection,
) {
  let clone = $cloneWithProperties(currentNode);
  clone = $isTextNode(clone)
    ? $sliceSelectedTextNodeContent(selection, clone)
    : clone;
  console.log("clone", clone);

  const serialized = $serializeTheNode(clone);
  return serialized;
}

function checkIfSelected(currentNode: LexicalNode, selection: RangeSelection) {
  return currentNode.isSelected(selection);
}

function $checkIfShouldBeIncluded(
  currentNode: LexicalNode,
  selection: RangeSelection,
) {
  let includedNode: BaseSerializedNode | null = null;
  const clonedNode = $cloneAndSliceAndSerializeTheNode(currentNode, selection);

  if (checkIfSelected(currentNode, selection)) {
    includedNode = clonedNode;
  }

  const children = $isElementNode(currentNode) ? currentNode.getChildren() : [];
  for (const childNode of children) {
    const includedChildNode = $checkIfShouldBeIncluded(childNode, selection);

    if (includedChildNode) {
      if (includedNode) {
        includedNode.children?.push(includedChildNode);
      } else if (
        !includedNode &&
        $isElementNode(currentNode) &&
        currentNode.extractWithChild(childNode, selection, "clone")
      ) {
        includedNode = clonedNode;
        includedNode.children?.push(includedChildNode);
      } else {
        includedNode = includedChildNode;
      }
    }
  }

  return includedNode;
}

function $serializeBlockContainer(block: BlockContainerNode) {
  const serializedBlockContainer = block.exportJSON();
  const childContainer = block.getBlockChildContainerNode();
  const childBlocks = childContainer?.getChildren() ?? [];
  const children = [];
  for (const childNode of childBlocks) {
    const serializedChildBlocks = $serializeBlockContainer(childNode);
    children.push(serializedChildBlocks);
  }
  serializedBlockContainer.childBlocks = children;
  return serializedBlockContainer;
}

export function $convertSelectionIntoLexicalContent(
  selection: RangeSelection,
  editor: LexicalEditor,
): null | string {
  const domSelection = editor._window?.getSelection();
  if (!domSelection) return null;

  const anchorDOM = domSelection.anchorNode;
  const focusDOM = domSelection.focusNode;
  if (
    anchorDOM !== null &&
    focusDOM !== null &&
    !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
  )
    return null;

  const selectedNodes = selection.getNodes();
  const onlyTopLevelNodes = selectOnlyTopNodes(selectedNodes);
  const nodes: BaseSerializedNode[] = [];

  if (onlyTopLevelNodes.find((node) => $isBlockContainerNode(node))) {
    // Used to convert BlockContainers.
    for (const currentNode of onlyTopLevelNodes as BlockContainerNode[]) {
      nodes.push($serializeBlockContainer(currentNode));
    }
  } else {
    // Used to convert childNodes of blockContentNode. Nodes like Paragraph, Header, etc...
    for (const currentNode of onlyTopLevelNodes) {
      const includedNode = $checkIfShouldBeIncluded(currentNode, selection);
      if (!includedNode) continue;

      nodes.push(includedNode);
    }
  }

  return JSON.stringify({
    namespace: editor._config.namespace,
    nodes,
  });
}
