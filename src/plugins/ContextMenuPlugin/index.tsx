import React, { useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $findParentBlockContainer,
  BlockChildContainerNode,
  BlockContainerNode,
  BlockContentNode,
} from "~/nodes/Block";
import {
  IconButton,
  List,
  ListDivider,
  ListItem,
  MenuItem,
  MenuList,
  Typography,
} from "@mui/joy";
import { Heading1, Heading2, Heading3, Type } from "lucide-react";
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isRangeSelection,
  $setSelection,
} from "lexical";
import { ClickAwayListener } from "@mui/base/ClickAwayListener";
import { $getSelectedBlocks } from "../SelectBlocksPlugin";
import { $createBlockTextNode, type BlockTextTagType } from "~/nodes/BlockText";

const ContextMenuPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const [menuState, setMenuState] = useState<{
    x: number;
    y: number;
    isOpen: boolean;
    selectedNodes: BlockContainerNode[];
  }>({
    x: 0,
    y: 0,
    isOpen: false,
    selectedNodes: [],
  });

  const showContextMenu = (
    position: { x: number; y: number },
    nodes: BlockContainerNode[],
  ) => {
    setMenuState((prevState) => {
      editor.update(() => {
        prevState.selectedNodes.forEach((node) => node.setSelected(false));
        nodes.forEach((node) => node.setSelected(true));
      });
      return {
        x: position.x,
        y: position.y,
        isOpen: true,
        selectedNodes: nodes,
      };
    });
  };
  const hideContextMenu = () => {
    setMenuState((prevState) => {
      editor.update(() => {
        prevState.selectedNodes.forEach((node) => node.setSelected(false));
      });
      return {
        x: 0,
        y: 0,
        isOpen: false,
        selectedNodes: [],
      };
    });
    editor.update(() => {
      $setSelection(null);
    });
  };

  useEffect(() => {
    if (
      !editor.hasNodes([
        BlockContainerNode,
        BlockContentNode,
        BlockChildContainerNode,
      ])
    ) {
      throw new Error(
        "ContextMenuPlugin: Some nodes are not registered on editor",
      );
    }
    const handleContextMenu = (e: MouseEvent) => {
      // TODO: consider the menu leaving the view;
      const target = e.target as HTMLElement | null;
      editor.update(() => {
        const selection = $getSelection();
        if (!selection || !$isRangeSelection(selection)) return;
        const selectedBlocks = $getSelectedBlocks(selection);
        if (selectedBlocks.length > 1) {
          e.preventDefault();
          showContextMenu({ x: e.pageX, y: e.pageY }, selectedBlocks);
          return;
        }
        const targetNode = target && $getNearestNodeFromDOMNode(target);
        const blockNode = targetNode && $findParentBlockContainer(targetNode);
        if (blockNode) {
          e.preventDefault();
          showContextMenu({ x: e.pageX, y: e.pageY }, [blockNode]);
        } else {
          hideContextMenu();
        }
      });
    };
    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [editor]);

  const handleTextTransform = (tag: BlockTextTagType) => {
    editor.update(() => {
      menuState.selectedNodes.forEach((node) => {
        const nodeContentChildren = node.getBlockContentNode().getChildren();
        const nodeChildBlocks = node.getBlockChildContainerNode().getChildren();
        const header1 = $createBlockTextNode({
          tag: tag,
          contentChildren: nodeContentChildren,
          childBlocks: nodeChildBlocks,
        });
        node.insertAfter(header1);
        node.remove();
        // header1.getFirstDescendant()?.selectEnd();
        hideContextMenu();
      });
    });
  };

  const handleExpandAndCollapse = (expand: boolean) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!selection || !$isRangeSelection(selection)) return;
      const selectedBlocks = $getSelectedBlocks(selection);
      if (expand) {
        selectedBlocks.forEach((block) => block.setOpen(true));
      } else {
        selectedBlocks.forEach((block) => block.setOpen(false));
      }
      hideContextMenu();
    });
  };

  // TODO Handle copy/cut, paste
  // const handleCopy = (e: MouseEvent) => {
  //   editor.update(() => {
  //     const selection = $getSelection;
  //     if (!selection || !$isRangeSelection(selection)) return;
  //     // dispatchCommand(editor, COPY_COMMAND, null);
  //     // void (async () => {
  //     //   const clipboardItems =
  //     //     typeof navigator?.clipboard?.read === "function"
  //     //       ? await navigator.clipboard.read()
  //     //       : e.clipboardData.files;

  //     //   for (const clipboardItem of clipboardItems) {
  //     //     let blob;
  //     //     if (clipboardItem.type?.startsWith("image/")) {
  //     //       // For files from `e.clipboardData.files`.
  //     //       blob = clipboardItem;
  //     //       // Do something with the blob.
  //     //     } else {
  //     //       // For files from `navigator.clipboard.read()`.
  //     //       const imageTypes = clipboardItem.types?.filter((type) =>
  //     //         type.startsWith("image/"),
  //     //       );
  //     //       for (const imageType of imageTypes) {
  //     //         blob = await clipboardItem.getType(imageType);
  //     //         // Do something with the blob.
  //     //       }
  //     //     }
  //     //   }
  //     // })();
  //   });
  // };
  // const handlePaste = () => {};
  // const handleCut = () => {};
  // const handleDelete = () => {};

  return menuState.isOpen ? (
    <ClickAwayListener
      onClickAway={(event) => {
        hideContextMenu();
      }}
    >
      <MenuList
        component="div"
        variant="outlined"
        size="sm"
        sx={{
          boxShadow: "sm",
          flexGrow: 0,
          minWidth: 200,
          overflow: "auto",
          position: "absolute",
          left: menuState.x,
          top: menuState.y,
        }}
      >
        <List orientation="horizontal">
          {[
            {
              id: "1",
              icon: <Heading1 />,
              eventHandler: () => handleTextTransform("h1"),
            },
            {
              id: "2",
              icon: <Heading2 />,
              eventHandler: () => handleTextTransform("h2"),
            },
            {
              id: "3",
              icon: <Heading3 />,
              eventHandler: () => handleTextTransform("h3"),
            },
            {
              id: "4",
              icon: <Type />,
              eventHandler: () => handleTextTransform("p"),
            },
          ].map((menu) => {
            return (
              <ListItem key={menu.id} onClick={menu.eventHandler}>
                <IconButton>{menu.icon}</IconButton>
              </ListItem>
            );
          })}
        </List>
        <ListDivider />
        {/* {[
          { title: "Cut", shortcut: "⌘ x", eventHandler: () => handleCopy() },
          { title: "Copy", shortcut: "⌘ c", eventHandler: () => handlePaste() },
          { title: "Paste", shortcut: "⌘ p", eventHandler: () => handleCut() },
          {
            title: "Delete",
            shortcut: "⌫",
            eventHandler: () => handleDelete(),
          },
        ].map((menu) => (
          <MenuItem key={menu.title}>
            {menu.title}
            <Typography level="body-sm" textColor="text.tertiary" ml="auto">
              {menu.shortcut}
            </Typography>
          </MenuItem>
        ))}
        <ListDivider /> */}
        {[
          {
            title: "Expand",
            shortcut: "",
            eventHandler: () => handleExpandAndCollapse(true),
          },
          {
            title: "Collapse",
            shortcut: "",
            eventHandler: () => handleExpandAndCollapse(false),
          },
          // {
          //   title: "Turn into task",
          //   shortcut: "",
          //   eventHandler: () => handleExpandAndCollapse(true),
          // },
        ].map((menu) => (
          <MenuItem key={menu.title} onClick={menu.eventHandler}>
            {menu.title}
            <Typography level="body-sm" textColor="text.tertiary" ml="auto">
              {menu.shortcut}
            </Typography>
          </MenuItem>
        ))}
      </MenuList>
    </ClickAwayListener>
  ) : null;
};

export { ContextMenuPlugin };
