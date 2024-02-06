import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import type { LexicalEditor } from "lexical";
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  isHTMLElement,
} from "lexical";
import * as React from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type BlockContainerNode,
  $findParentBlockContainer,
  $getSelectedBlocks,
} from "~/nodes/Block";
import { eventFiles } from "~/utils/lexical";

function setDragCirclePosition(
  targetElem: HTMLElement | null,
  floatingElem: HTMLElement,
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

function getFocusedElem(target: HTMLElement, editor: LexicalEditor) {
  return new Promise<HTMLElement>((resolve, reject) => {
    editor.update(() => {
      const targetNode = $getNearestNodeFromDOMNode(target);
      if (!targetNode) {
        return;
      }

      const blockNode = $findParentBlockContainer(targetNode);
      const blockNodeKey = blockNode?.getKey();
      const blockElem = editor.getElementByKey(blockNodeKey!);

      if (blockElem) {
        resolve(blockElem);
      } else {
        reject();
      }
    });
  });
}

function setTargetLine(
  targetLineElem: HTMLElement,
  targetBlockElem: HTMLElement,
) {
  const { top, height, left, width } = targetBlockElem.getBoundingClientRect();
  targetLineElem.style.transform = `translate(${left}px, ${top + height}px)`;
  targetLineElem.style.width = `${width}px`;
  targetLineElem.style.opacity = ".4";
}

export function DraggableBlockPlugin({
  editorRef,
}: {
  editorRef: HTMLDivElement;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const targetLineRef = useRef<HTMLDivElement>(null);
  const dragCircleRef = useRef<HTMLDivElement>(null);
  const dragImageContainer = useRef<HTMLDivElement | null>(null);
  const [draggableBlockElems, setDraggableBlockElems] = useState<HTMLElement[]>(
    [],
  );

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const target = event.target;
      if (!isHTMLElement(target!)) return;

      let selectedBlockElements: HTMLElement[] = [];
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const selectedBlocks = $getSelectedBlocks(selection);
          selectedBlockElements = selectedBlocks
            .map((block) => editor.getElementByKey(block.getKey()))
            .flatMap((node) => {
              const result = node;
              return !!result ? [result] : [];
            });
        }
      });

      getFocusedElem(target, editor)
        .then((_draggableBlockElem) => {
          if (selectedBlockElements.length > 1) {
            setDraggableBlockElems(selectedBlockElements);
          } else if (_draggableBlockElem) {
            setDraggableBlockElems([_draggableBlockElem]);
          } else {
            setDraggableBlockElems([]);
          }
        })
        .catch((err) => console.error("onmousemove", err));
    }

    function onMouseLeave() {
      console.log("onMouseLeave");
    }

    editorRef.addEventListener("mousemove", onMouseMove);
    editorRef.addEventListener("mouseleave", onMouseLeave);

    return () => {
      editorRef.removeEventListener("mousemove", onMouseMove);
      editorRef.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [editor, editorRef]);

  useEffect(() => {
    if (dragCircleRef.current) {
      setDragCirclePosition(draggableBlockElems[0]!, dragCircleRef.current);
    }
  }, [draggableBlockElems]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        DRAGOVER_COMMAND,
        (event) => {
          event.preventDefault();
          const targetLineElem = targetLineRef.current;

          const [isFileTransfer] = eventFiles(event);
          if (isFileTransfer) return false;

          const target = event.target;
          if (!isHTMLElement(target!)) return false;

          if (!targetLineElem) return false;

          getFocusedElem(target, editor)
            .then((targetBlockElem) => {
              setTargetLine(targetLineElem, targetBlockElem);
            })
            .catch((err) => console.error(err));

          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => {
          event.preventDefault();
          const [isFileTransfer] = eventFiles(event);
          if (isFileTransfer) return false;

          const { target } = event;
          if (!isHTMLElement(target!)) return false;

          getFocusedElem(target, editor)
            .then((targetBlockElem) => {
              editor.update(() => {
                const targetNode = $getNearestNodeFromDOMNode(
                  targetBlockElem,
                ) as BlockContainerNode;
                if (!targetNode) return false;

                const draggableBlockNodes = draggableBlockElems.map((elem) =>
                  $getNearestNodeFromDOMNode(elem),
                ) as BlockContainerNode[];

                // To prevent the selected element from being dropped inside its children
                const children = [...draggableBlockNodes];
                while (children.length) {
                  const currentNode = children.pop();

                  if (currentNode?.getKey() === targetNode.getKey()) {
                    return false;
                  }

                  const childContainers = currentNode
                    ?.getBlockChildContainerNode()
                    .getChildren();
                  if (childContainers?.length) {
                    for (const child of childContainers) {
                      children.push(child);
                    }
                  }
                }

                draggableBlockNodes.reverse().forEach((node) => {
                  targetNode.insertAfter(node);
                });

                setDraggableBlockElems([]);
              });
            })
            .catch((err) => console.error(err));

          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, draggableBlockElems]);

  function onDragStart(
    event: ReactDragEvent<HTMLDivElement>,
    draggableBlockElems: HTMLElement[],
    dragImageContainer: HTMLDivElement,
  ): void {
    const dataTransfer = event.dataTransfer;

    if (draggableBlockElems.length) {
      draggableBlockElems.forEach((element) => {
        const clonedDiv = element.cloneNode(true) as HTMLElement;
        clonedDiv?.classList?.remove("selected");
        dragImageContainer.appendChild(clonedDiv);
      });
      setDragImage(dataTransfer, dragImageContainer);
      return;
    }
  }

  function onDragEnd(
    targetLineRef: HTMLDivElement | null,
    dragImageContainer: HTMLDivElement | null,
  ): void {
    if (dragImageContainer) {
      dragImageContainer.innerHTML = ""; // To clean up dragImage
      dragImageContainer.style.opacity = "0";
      dragImageContainer.style.transform = "translate(-10000px, -10000px)";
    }
    if (targetLineRef) {
      targetLineRef.style.opacity = "0";
      targetLineRef.style.transform = "translate(-10000px, -10000px)";
    }
  }

  return createPortal(
    <>
      <div
        className="draggable-block-menu"
        ref={dragCircleRef}
        draggable={true}
        onDragStart={(event) =>
          onDragStart(event, draggableBlockElems, dragImageContainer.current!)
        }
        onDragEnd={() =>
          onDragEnd(targetLineRef.current, dragImageContainer.current)
        }
      />
      <div className="draggable-block-target-line" ref={targetLineRef} />
      {/* HACK: to show multiple dragImages */}
      <div
        className="absolute translate-x-[10000px]"
        ref={dragImageContainer}
      ></div>
    </>,
    editorRef,
  );
}
