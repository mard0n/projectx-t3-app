/* eslint-disable @typescript-eslint/prefer-for-of */
import { type BaseSerializedNode } from "@lexical/clipboard/clipboard";
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
  isHTMLElement,
} from "lexical";
import { selectOnlyTopNodes } from ".";
import {
  $findParentBlockContainer,
  $isBlockContainerNode,
  $isBlockContentNode,
  type BlockContainerNode,
} from "~/nodes/Block";
import { $findMatchingParent } from "@lexical/utils";

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

function $cloneSliceAndSerializeNode(
  currentNode: LexicalNode,
  selection: RangeSelection,
) {
  let includedNode: BaseSerializedNode | null = null;
  let clone = $cloneWithProperties(currentNode);
  clone = $isTextNode(clone)
    ? $sliceSelectedTextNodeContent(selection, clone)
    : clone;

  const clonedAndSerializedNode = $serializeTheNode(clone);

  if (currentNode.isSelected(selection)) {
    includedNode = clonedAndSerializedNode;
  }

  const children = $isElementNode(currentNode) ? currentNode.getChildren() : [];
  for (const childNode of children) {
    const includedChildNode = $cloneSliceAndSerializeNode(childNode, selection);

    if (includedChildNode) {
      if (includedNode) {
        includedNode.children?.push(includedChildNode);
      } else if (
        !includedNode &&
        $isElementNode(currentNode) &&
        currentNode.extractWithChild(childNode, selection, "clone")
      ) {
        includedNode = clonedAndSerializedNode;
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
  const childBlocks = block.getBlockChildContainerNode().getChildren();
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
      const clonedNode = $cloneSliceAndSerializeNode(currentNode, selection);
      if (!clonedNode) continue;

      nodes.push(clonedNode);
    }
  }

  return JSON.stringify({
    namespace: editor._config.namespace,
    nodes,
  });
}

function $cloneSliceAndConvertToHTMLNode(
  editor: LexicalEditor,
  currentNode: LexicalNode,
  parentElement: HTMLElement | DocumentFragment,
  selection: RangeSelection | null = null,
): boolean {
  let shouldInclude =
    selection != null ? currentNode.isSelected(selection) : true;
  const shouldExclude =
    $isElementNode(currentNode) && currentNode.excludeFromCopy("html");
  let target = currentNode;

  if (selection !== null) {
    let clone = $cloneWithProperties<LexicalNode>(currentNode);
    clone =
      $isTextNode(clone) && selection != null
        ? $sliceSelectedTextNodeContent(selection, clone)
        : clone;
    target = clone;
  }

  const registeredNode = editor._nodes.get(target.getType());
  let exportOutput;

  // Use HTMLConfig overrides, if available.
  if (registeredNode?.exportDOM !== undefined) {
    exportOutput = registeredNode.exportDOM(editor, target);
  } else {
    exportOutput = target.exportDOM(editor);
  }

  const { element, after } = exportOutput;

  if (!element) {
    return false;
  }

  const fragment = document.createDocumentFragment();
  const children = $isElementNode(target) ? target.getChildren() : [];
  for (const childNode of children) {
    const shouldIncludeChild = $cloneSliceAndConvertToHTMLNode(
      editor,
      childNode,
      fragment,
      selection,
    );

    if (
      !shouldInclude &&
      $isElementNode(currentNode) &&
      shouldIncludeChild &&
      currentNode.extractWithChild(childNode, selection, "html")
    ) {
      shouldInclude = true;
    }
  }

  if (shouldInclude && !shouldExclude) {
    if (isHTMLElement(element)) {
      element.append(fragment);
    }
    parentElement.append(element);

    if (after) {
      const newElement = after.call(target, element);
      if (newElement) element.replaceWith(newElement);
    }
  } else {
    parentElement.append(fragment);
  }

  return shouldInclude;
}

function $convertBlockContainerToHTML(
  blockNode: LexicalNode,
  editor: LexicalEditor,
) {
  const { element } = blockNode.exportDOM(editor);
  if (!element) return;

  if ($isElementNode(blockNode)) {
    for (const currentNode of blockNode.getChildren()) {
      const childHtml = $convertBlockContainerToHTML(currentNode, editor);
      if (!childHtml) continue;
      element.appendChild(childHtml);
    }
  }
  return element;
}

export function $convertSelectionIntoHTMLContent(
  selection: RangeSelection,
  editor: LexicalEditor,
) {
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
  const container = document.createElement("div");

  if (onlyTopLevelNodes.find((node) => $isBlockContainerNode(node))) {
    // Used to convert BlockContainers.
    for (const currentNode of onlyTopLevelNodes as BlockContainerNode[]) {
      const html = $convertBlockContainerToHTML(currentNode, editor);
      if (html) {
        container.appendChild(html);
      }
    }
  } else {
    // Used to convert childNodes of blockContentNode. Nodes like Paragraph, Header, etc...
    for (const currentNode of onlyTopLevelNodes) {
      $cloneSliceAndConvertToHTMLNode(
        editor,
        currentNode,
        container,
        selection,
      );
    }
  }

  return container.innerHTML;
}

export function $customInsertGeneratedNodes(
  nodes: LexicalNode[],
  selection: RangeSelection,
) {
  function findFocusableNode(node: BlockContainerNode | ElementNode) {
    let nodeToFocus = null;

    if ($isBlockContainerNode(node)) {
      nodeToFocus = node.getBlockContentNode().getLastChild();
    } else {
      nodeToFocus = node.getLastDescendant()!;
    }

    return nodeToFocus as ElementNode | TextNode;
  }

  let nextFocusNode = selection.anchor.getNode() as TextNode | ElementNode;

  for (const pasteNode of nodes) {
    const nextFocusContainer = $findParentBlockContainer(nextFocusNode);

    if (!nextFocusContainer) return false;

    if (
      $isBlockContainerNode(pasteNode) &&
      $isBlockContainerNode(nextFocusContainer) &&
      !nextFocusContainer.getBlockContentNode().getTextContentSize() &&
      !nextFocusContainer.getBlockChildContainerNode().getChildren().length
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
