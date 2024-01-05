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
import type { MutableRefObject, DragEvent as ReactDragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  $isBlockContainerNode,
  type BlockContainerNode,
} from "../BlockContainer";

function getBlockElement(
  draggingBlock: string[] | false,
  editor: LexicalEditor,
  event: MouseEvent,
  useEdgeAsDefault = false,
): HTMLElement | null {
  // const anchorElementRect = anchorElem.getBoundingClientRect();
  const topLevelNodeKeys = editor
    .getEditorState()
    .read(() => $getRoot().getChildrenKeys());
  const allBlockContainerNodes = editor.getEditorState().read(() => {
    const result: LexicalNode[] = [];

    const children = $getRoot()
      .getChildren()
      .filter((node): node is BlockContainerNode =>
        $isBlockContainerNode(node),
      );
    while (children.length) {
      const child = children[0];
      if (!child) continue;
      result.push(child);
      const cPContainerChildren = child
        .getChildBlockChildContainerNode()
        ?.getChildren<BlockContainerNode>();

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
    // let index = getCurrentIndex(allBlockContainerNodes.length);
    // let direction = Indeterminate;

    const paragraphsContainingPoint: HTMLElement[] = [];

    while (index >= 0 && index < allBlockContainerNodes.length) {
      const paragraph = allBlockContainerNodes[index];
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
    const draggingBlockNodes = draggingBlock.map((node) => {
      return $getNodeByKey(node);
    }) as LexicalNode[];
    const targetBlockToDrop = $getNearestNodeFromDOMNode(blockElem);

    const isDescendantsContain = (
      parentNode: (ElementNode | LexicalNode)[],
      targetNode: LexicalNode,
    ): boolean => {
      for (const block of parentNode) {
        if (block.getKey() === targetNode.getKey()) {
          return true;
        }

        if (
          "getChildren" in block &&
          (block as ElementNode).getChildren().length > 0
        ) {
          // Recursively check in the children
          if (
            isDescendantsContain(
              (block as ElementNode).getChildren(),
              targetNode,
            )
          ) {
            return true;
          }
        }
      }

      return false;
    };

    if (
      draggingBlockNodes.length &&
      isDescendantsContain(draggingBlockNodes, targetBlockToDrop!)
    )
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

export default function DraggableBlockPlugin({
  anchorElem = document.body,
  selectedBlocks,
}: {
  anchorElem: HTMLElement;
  selectedBlocks: MutableRefObject<BlockContainerNode[] | null>;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  // console.log("anchorElem", anchorElem);

  const scrollerElem = anchorElem.parentElement;

  const dragBoxRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const draggingBlockRef = useRef<string[] | false>(false); // To prevent parent to dropping into its child
  const [draggableBlockElem, setDraggableBlockElem] =
    useState<HTMLElement | null>(null);


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
      // const dragData = dataTransfer?.getData(DRAG_DATA_FORMAT) ?? "";

      const draggedNodes = draggingBlockRef.current?.length
        ? (draggingBlockRef.current
            .map((key) => {
              return $getNodeByKey(key);
            })
            .filter(Boolean) as LexicalNode[])
        : null;
      if (!draggedNodes) {
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
      if (draggedNodes.includes(targetNode)) {
        return true;
      }

      draggedNodes.forEach((node) => {
        targetNode.insertAfter(node);
      });

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

    if (selectedBlocks.current?.length) {
      const wrapperDiv = document.getElementById("drag-image-wrapper")!;
      const selectedBlockElems = selectedBlocks.current.flatMap((node) => {
        const result = editor.getElementByKey(node.getKey());
        return !!result ? [result] : [];
      });
      selectedBlockElems.forEach((element) => {
        const clonedDiv = element.cloneNode(true) as HTMLElement;
        clonedDiv?.classList?.remove("selected");
        wrapperDiv.appendChild(clonedDiv);
      });
      setDragImage(dataTransfer, wrapperDiv);

      const selectedBlockKeys = selectedBlocks.current.map((node) =>
        node.getKey(),
      );
      draggingBlockRef.current = selectedBlockKeys;

      return;
    }

    if (draggableBlockElem) {
      setDragImage(dataTransfer, draggableBlockElem);

      let nodeKey = "";
      editor.update(() => {
        const node = $getNearestNodeFromDOMNode(draggableBlockElem);
        if (node) {
          nodeKey = node.getKey();
        }
      });

      draggingBlockRef.current = [nodeKey];
      return;
    }
  }

  function onDragEnd(): void {
    draggingBlockRef.current = false;
    const wrapperDiv = document.getElementById("drag-image-wrapper")!;
    wrapperDiv.innerHTML = ""; // To clean up dragImage
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
      <div id="drag-image-wrapper" className=" translate-x-[100000px]">
        Wrapper Div
      </div>
      {/* HACK: to show multiple dragImages */}
    </>,
    anchorElem,
  );
}

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
