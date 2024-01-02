// import "./index.css";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import type { ElementNode, LexicalEditor, LexicalNode } from "lexical";
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
} from "lexical";
import * as React from "react";
import { eventFiles, isHTMLElement, Point, Rect } from "../utils";
import type { DragEvent as ReactDragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { CPContainerNode } from "../CPContainer";
import { is_PARAGRAGRAPH } from "..";

const DRAG_DATA_FORMAT = "application/x-lexical-drag-block";

function getCollapsedMargins(elem: HTMLElement): {
  marginTop: number;
  marginBottom: number;
} {
  const getMargin = (
    element: Element | null,
    margin: "marginTop" | "marginBottom",
  ): number =>
    element ? parseFloat(window.getComputedStyle(element)[margin]) : 0;

  const { marginTop, marginBottom } = window.getComputedStyle(elem);
  const prevElemSiblingMarginBottom = getMargin(
    elem.previousElementSibling,
    "marginBottom",
  );
  const nextElemSiblingMarginTop = getMargin(
    elem.nextElementSibling,
    "marginTop",
  );
  const collapsedTopMargin = Math.max(
    parseFloat(marginTop),
    prevElemSiblingMarginBottom,
  );
  const collapsedBottomMargin = Math.max(
    parseFloat(marginBottom),
    nextElemSiblingMarginTop,
  );

  return { marginBottom: collapsedBottomMargin, marginTop: collapsedTopMargin };
}

function getBlockElement(
  draggingBlock: string | false,
  editor: LexicalEditor,
  event: MouseEvent,
  useEdgeAsDefault = false,
): HTMLElement | null {
  // const anchorElementRect = anchorElem.getBoundingClientRect();
  const topLevelNodeKeys = editor
    .getEditorState()
    .read(() => $getRoot().getChildrenKeys());
  const allCPContainerNodes = editor.getEditorState().read(() => {
    const result: LexicalNode[] = [];

    const children = $getRoot().getChildren().filter(is_PARAGRAGRAPH);
    while (children.length) {
      const child = children[0];
      if (!child) continue;
      result.push(child);
      const cPContainerChildren = child
        .getChildContainerNode()
        ?.getChildren<CPContainerNode>();

      if (cPContainerChildren?.length) {
        children.push(...cPContainerChildren);
      }
      children.shift();
    }

    return result;
  });

  let blockElem: HTMLElement | null = null;

  editor.getEditorState().read(() => {
    if (useEdgeAsDefault && topLevelNodeKeys.length) {
      const firstNode = topLevelNodeKeys[0];
      const lastNode = topLevelNodeKeys[topLevelNodeKeys.length - 1];
      const firstElem = firstNode && editor.getElementByKey(firstNode);
      const lastElem = lastNode && editor.getElementByKey(lastNode);

      if (firstElem && lastElem) {
        const [firstNodeRect, lastNodeRect] = [
          firstElem?.getBoundingClientRect(),
          lastElem?.getBoundingClientRect(),
        ];

        if (firstNodeRect && lastNodeRect) {
          if (event.y < firstNodeRect.top) {
            blockElem = firstElem;
          } else if (event.y > lastNodeRect.bottom) {
            blockElem = lastElem;
          }

          if (blockElem) {
            return;
          }
        }
      }
    }

    let index = 0;
    // let index = getCurrentIndex(allCPContainerNodes.length);
    // let direction = Indeterminate;

    const paragraphsContainingPoint: HTMLElement[] = [];

    while (index >= 0 && index < allCPContainerNodes.length) {
      const paragraph = allCPContainerNodes[index];
      const elem = paragraph
        ? editor.getElementByKey(paragraph.getKey())
        : null;

      if (elem === null) {
        break;
      }
      const point = new Point(event.x, event.y);
      const domRect = Rect.fromDOM(elem);
      const { marginTop, marginBottom } = getCollapsedMargins(elem);

      const rect = domRect.generateNewRect({
        bottom: domRect.bottom + marginBottom,
        left: domRect.left,
        right: domRect.right,
        top: domRect.top - marginTop,
      });

      const {
        result,
        reason: { isOnTopSide, isOnBottomSide },
      } = rect.contains(point);

      if (result) {
        paragraphsContainingPoint.push(elem);
      }

      index += 1;
    }

    // console.log('paragraphsContainingPoint', paragraphsContainingPoint);

    const getElemAreaRect = (elem: HTMLElement) => {
      const pElemRect = elem.getBoundingClientRect();
      const width: number = pElemRect.right - pElemRect.left,
        height: number = pElemRect.bottom - pElemRect.top;
      return width * height;
    };

    // console.log("paragraphsContainingPoint", paragraphsContainingPoint);

    const elementWithSmallestArea = [...paragraphsContainingPoint].reduce(
      (acc, current) => {
        if (!acc) return current;
        const accArea = getElemAreaRect(acc);
        const currentArea = getElemAreaRect(current);
        return currentArea < accArea ? current : acc;
      },
      paragraphsContainingPoint[0],
    );

    // console.log("elementWithSmallestArea", elementWithSmallestArea);

    if (elementWithSmallestArea) {
      blockElem = elementWithSmallestArea;
    }
  });

  if (draggingBlock && blockElem) {
    const draggingBlockNode = $getNodeByKey<CPContainerNode>(draggingBlock);
    const targetBlockToDrop = $getNearestNodeFromDOMNode(blockElem);

    const isDescendantsContain = (
      parentNode: ElementNode | LexicalNode,
      targetNode: LexicalNode,
    ): boolean => {
      if (parentNode.getKey() === targetNode.getKey()) {
        return true;
      }

      const children =
        "getChildren" in parentNode
          ? (parentNode as ElementNode).getChildren()
          : [];
      for (const block of children) {
        if (isDescendantsContain(block, targetNode)) {
          return true;
        }
      }
      return false;
    };

    if (isDescendantsContain(draggingBlockNode!, targetBlockToDrop!))
      return null;
  }
  return blockElem;
}

function setDragBoxPosition(
  targetElem: HTMLElement | null,
  floatingElem: HTMLElement,
  anchorElem: HTMLElement,
) {
  if (!targetElem) {
    floatingElem.style.opacity = "0";
    floatingElem.style.transform = "translate(-10000px, -10000px)";
    return;
  }

  const targetRect = targetElem.getBoundingClientRect();

  const top = targetRect.top;

  const left = targetRect.left;
  floatingElem.style.opacity = "1";
  floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}

function setDragImage(
  dataTransfer: DataTransfer,
  draggableBlockElem: HTMLElement,
) {
  const { transform } = draggableBlockElem.style;

  // Remove dragImage borders
  draggableBlockElem.style.transform = "translateZ(0)";
  dataTransfer.setDragImage(draggableBlockElem, 0, 0);

  setTimeout(() => {
    draggableBlockElem.style.transform = transform;
  });
}

function setTargetLine(
  targetLineElem: HTMLElement,
  targetBlockElem: HTMLElement,
  mouseY: number,
  anchorElem: HTMLElement,
) {
  const {
    top: targetBlockElemTop,
    height: targetBlockElemHeight,
    left: targetBlockElemLeft,
  } = targetBlockElem.getBoundingClientRect();
  const { top: anchorTop, width: anchorWidth } =
    anchorElem.getBoundingClientRect();

  // const { marginTop, marginBottom } = getCollapsedMargins(targetBlockElem);

  const top = targetBlockElemTop + targetBlockElemHeight;
  const left = targetBlockElemLeft;

  targetLineElem.style.transform = `translate(${left}px, ${top}px)`;
  targetLineElem.style.width = `${anchorWidth}px`;
  targetLineElem.style.opacity = ".4";
}

function useDraggableBlockMenu(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  isEditable: boolean,
): JSX.Element {
  // console.log("anchorElem", anchorElem);

  const scrollerElem = anchorElem.parentElement;

  const dragBoxRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const draggingBlockRef = useRef<string | false>(false);
  const [draggableBlockElem, setDraggableBlockElem] =
    useState<HTMLElement | null>(null);

  // console.log('draggableBlockElem', draggableBlockElem);

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const target = event.target;
      if (!isHTMLElement(target)) {
        setDraggableBlockElem(null);
        return;
      }

      const _draggableBlockElem = getBlockElement(
        draggingBlockRef.current,
        editor,
        event,
      );

      setDraggableBlockElem(_draggableBlockElem);
    }

    function onMouseLeave() {
      setDraggableBlockElem(null);
    }

    scrollerElem?.addEventListener("mousemove", onMouseMove);
    scrollerElem?.addEventListener("mouseleave", onMouseLeave);

    return () => {
      scrollerElem?.removeEventListener("mousemove", onMouseMove);
      scrollerElem?.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [scrollerElem, anchorElem, editor]);

  useEffect(() => {
    if (dragBoxRef.current) {
      setDragBoxPosition(draggableBlockElem, dragBoxRef.current, anchorElem);
    }
  }, [anchorElem, draggableBlockElem]);

  useEffect(() => {
    function onDragover(event: DragEvent): boolean {
      if (!draggingBlockRef.current) {
        return false;
      }
      const [isFileTransfer] = eventFiles(event);
      if (isFileTransfer) {
        return false;
      }
      const { pageY, target } = event;
      if (!isHTMLElement(target)) {
        return false;
      }
      const targetBlockElem = getBlockElement(
        draggingBlockRef.current,
        editor,
        event,
        true,
      );

      const targetLineElem = targetLineRef.current;
      if (targetBlockElem === null || targetLineElem === null) {
        return false;
      }
      setTargetLine(targetLineElem, targetBlockElem, pageY, anchorElem);
      // Prevent default event to be able to trigger onDrop events
      event.preventDefault();
      return true;
    }

    function onDrop(event: DragEvent): boolean {
      if (!draggingBlockRef.current) {
        return false;
      }
      const [isFileTransfer] = eventFiles(event);
      if (isFileTransfer) {
        return false;
      }
      const { target, dataTransfer, pageY } = event;
      const dragData = dataTransfer?.getData(DRAG_DATA_FORMAT) ?? "";
      const draggedNode = $getNodeByKey(dragData);
      if (!draggedNode) {
        return false;
      }
      if (!isHTMLElement(target)) {
        return false;
      }
      const targetBlockElem = getBlockElement(
        draggingBlockRef.current,
        editor,
        event,
        true,
      );
      if (!targetBlockElem) {
        return false;
      }
      const targetNode = $getNearestNodeFromDOMNode(targetBlockElem);
      if (!targetNode) {
        return false;
      }
      if (targetNode === draggedNode) {
        return true;
      }
      const targetBlockElemTop = targetBlockElem.getBoundingClientRect().top;
      if (pageY >= targetBlockElemTop) {
        targetNode.insertAfter(draggedNode);
      } else {
        targetNode.insertBefore(draggedNode);
      }
      setDraggableBlockElem(null);

      return true;
    }

    return mergeRegister(
      editor.registerCommand(
        DRAGOVER_COMMAND,
        (event) => {
          return onDragover(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => {
          return onDrop(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [anchorElem, editor]);

  function onDragStart(event: ReactDragEvent<HTMLDivElement>): void {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer || !draggableBlockElem) {
      return;
    }
    setDragImage(dataTransfer, draggableBlockElem);
    let nodeKey = "";
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(draggableBlockElem);
      if (node) {
        nodeKey = node.getKey();
      }
    });
    draggingBlockRef.current = nodeKey;
    dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey);
  }

  function onDragEnd(): void {
    draggingBlockRef.current = false;
    if (targetLineRef.current) {
      targetLineRef.current.style.opacity = "0";
      targetLineRef.current.style.transform = "translate(-10000px, -10000px)";
    }
  }

  return createPortal(
    <>
      <div
        className="draggable-block-menu"
        ref={dragBoxRef}
        draggable={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      ></div>
      <div className="draggable-block-target-line" ref={targetLineRef} />
    </>,
    anchorElem,
  );
}

export default function DraggableBlockPlugin({
  anchorElem = document.body,
}: {
  anchorElem: HTMLElement;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return useDraggableBlockMenu(editor, anchorElem, editor._editable);
}
