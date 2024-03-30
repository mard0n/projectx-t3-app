import React, { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $findParentBlockContainer,
  BlockChildContainerNode,
  BlockContainerNode,
  BlockContentNode,
} from "~/nodes/Block";
import {
  $getNearestNodeFromDOMNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { Divider } from "@mui/joy";
import { getOffsetRectRelativeToBody } from "~/utils/extension";
import { Plus } from "lucide-react";
import { $createBlockTextNode } from "~/nodes/BlockText";
import { $isBlockNoteNode, type BlockNoteNode } from "~/nodes/BlockNote";
import { $createBlockNoteNode } from "~/nodes/BlockNote/BlockNote";

// TODO Make it reusable. So you can use it in Drag and drop
function getFocusedElem(target: HTMLElement, editor: LexicalEditor) {
  return new Promise<{
    elem: HTMLElement;
    node: BlockContainerNode | BlockNoteNode;
  }>((resolve, reject) => {
    editor.update(() => {
      const targetNode = $getNearestNodeFromDOMNode(target);

      if (!targetNode) {
        reject(null);
        return;
      }

      if ($isBlockNoteNode(targetNode)) {
        const noteNodeKey = targetNode.getKey();
        const noteElem = editor.getElementByKey(noteNodeKey);

        if (noteElem) {
          resolve({ elem: noteElem, node: targetNode });
        } else {
          reject(null);
        }
      }

      const blockNode = $findParentBlockContainer(targetNode);
      if (!blockNode) {
        reject(null);
        return;
      }

      const blockNodeKey = blockNode.getKey();
      const blockElem = editor.getElementByKey(blockNodeKey);

      if (blockElem) {
        resolve({ elem: blockElem, node: blockNode });
      } else {
        reject(null);
      }
    });
  });
}

function showTargetLine(
  targetLineElem: HTMLHRElement,
  targetBlockElem: HTMLElement,
  positionTop: boolean,
) {
  const { top, height, left, width } =
    getOffsetRectRelativeToBody(targetBlockElem);

  const targetStyles = window.getComputedStyle(targetBlockElem);

  const paddingLeft = Number(
    targetStyles.getPropertyValue("padding-left").slice(0, -2),
  );

  const y = positionTop ? top : top + height;
  targetLineElem.style.transform = `translate(${left + paddingLeft}px, calc(${y + 4}px - 50%))`;
  targetLineElem.style.width = `${width - paddingLeft + 24}px`;
  targetLineElem.style.opacity = "1";
  document.body.style.cursor = "cell";
}

function hideTargetLine(targetLineElem: HTMLHRElement) {
  targetLineElem.style.opacity = "1";
  targetLineElem.style.width = `0px`;
  document.body.style.removeProperty("cursor");
}

const AddNewBlockPlugin = ({}) => {
  const [editor] = useLexicalComposerContext();
  const isHotKeyActivated = useRef(false);
  const dividerRef = useRef<HTMLHRElement | null>(null);
  const targetBlockElemRef = useRef<{
    elem: HTMLElement;
    node: LexicalNode;
    positionTop: boolean;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        isHotKeyActivated.current = true;
        if (targetBlockElemRef.current && dividerRef.current) {
          showTargetLine(
            dividerRef.current,
            targetBlockElemRef.current.elem,
            targetBlockElemRef.current.positionTop,
          );
        }
      }
    };
    const handleKeyUp = () => {
      isHotKeyActivated.current = false;
      hideTargetLine(dividerRef.current!);
    };

    const handleClick = () => {
      if (targetBlockElemRef.current && isHotKeyActivated.current) {
        editor.update(() => {
          const blockTextNode = $createBlockTextNode({ tag: "p" });
          if ($isBlockNoteNode(targetBlockElemRef.current?.node)) {
            const blockNoteNode = $createBlockNoteNode().append(blockTextNode);
            if (targetBlockElemRef.current.positionTop) {
              targetBlockElemRef.current.node.insertBefore(blockNoteNode);
            } else {
              targetBlockElemRef.current.node.insertAfter(blockNoteNode);
            }
          }

          if (targetBlockElemRef.current?.positionTop) {
            targetBlockElemRef.current.node.insertBefore(blockTextNode);
          } else {
            targetBlockElemRef.current!.node.insertAfter(blockTextNode);
          }
          blockTextNode.selectEnd();
          targetBlockElemRef.current = null;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    if (
      !editor.hasNodes([
        BlockContainerNode,
        BlockContentNode,
        BlockChildContainerNode,
      ])
    ) {
      throw new Error(
        "AddNewBlockPlugin: Some nodes are not registered on editor",
      );
    }
  }, [editor]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isHotKeyActivated.current) {
        const target = e.target as HTMLElement | null;

        if (!target || !dividerRef.current) return;
        getFocusedElem(target, editor)
          .then((targetBlockElem) => {
            const rect = targetBlockElem.elem.getBoundingClientRect();
            const y = e.clientY - rect.top;

            const positionTop = y <= rect.height / 2 ? true : false;
            showTargetLine(
              dividerRef.current!,
              targetBlockElem.elem,
              positionTop,
            );
            targetBlockElemRef.current = { ...targetBlockElem, positionTop };
          })
          .catch((err) => {
            hideTargetLine(dividerRef.current!);
            targetBlockElemRef.current = null;
          });
      } else {
        hideTargetLine(dividerRef.current!);
        targetBlockElemRef.current = null;
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [editor]);

  return (
    <Divider
      ref={dividerRef}
      sx={{
        position: "absolute",
        opacity: 0,
        top: 0,
        left: 0,
        "--Divider-lineColor": (theme) => theme.palette.primary.plainColor,
        "--Divider-thickness": "2px",
        "--Divider-childPosition": `calc(100%)`,
        pointerEvents: "none",
      }}
    >
      <Plus color="var(--joy-palette-primary-500, #0B6BCB)" />
    </Divider>
  );
};

export { AddNewBlockPlugin };
