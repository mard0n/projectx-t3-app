"use cient";
import Link from "next/link";
import { api } from "~/utils/api";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { useRef, useState } from "react";
import {
  SendingUpdatesPlugin,
  type UpdatedBlock,
  type Updates,
} from "~/plugins/SendingUpdatesPlugin";
import TreeViewPlugin from "~/plugins/TreeViewPlugin";
import { customTheme } from "~/utils/lexical/theme";
import {
  BlockChildContainerNode,
  BlockContainerNode,
  BlockContentNode,
} from "~/nodes/Block";
import { HierarchicalBlockPlugin } from "~/plugins/HierarchicalBlocksPlugin";
import { SelectBlocksPlugin } from "~/plugins/SelectBlocksPlugin";
import { HeaderNode } from "~/nodes/Header";
import { DraggableBlockPlugin } from "~/plugins/DraggableBlockPlugin";
import {
  BlockHighlightNode,
  BlockQuoteDecorator,
} from "~/nodes/BlockHighlight";
import {
  BLOCK_PARAGRAPH_TYPE,
  BlockParagraphNode,
  type SerializedBlockParagraphNode,
} from "~/nodes/BlockParagraph";
import { BLOCK_NOTE_TYPE, BlockNoteNode } from "~/nodes/BlockNote";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import LexicalClickableLinkPlugin from "@lexical/react/LexicalClickableLinkPlugin";
import LexicalAutoLinkPlugin from "~/plugins/LexicalAutoLinkPlugin";

function onError(error: Error) {
  console.error(error);
}

export default function Notes() {
  const [editorRef, setEditorRef] = useState<HTMLDivElement>();
  const onRef = (editorRef: HTMLDivElement) => {
    if (editorRef !== null) {
      setEditorRef(editorRef);
    }
  };
  const notes = api.note.getAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const saveChanges = api.note.saveChanges.useMutation();

  if (notes.isLoading) {
    return (
      <div className="flex min-h-screen px-2">
        <aside className="min-w-80 border-r pt-8">
          <Link href="/notes">All notes</Link>
        </aside>
        <main className="flex-grow p-8">Loading...</main>
      </div>
    );
  }

  if (notes.isError) {
    <div className="flex min-h-screen px-2">
      <aside className="min-w-80 border-r pt-8">
        <Link href="/notes">All notes</Link>
      </aside>
      <main className="flex-grow p-8">Failed. Try again later</main>
    </div>;
  }

  const handleUpdates = (updates: Updates) => {
    // const updatedBlocks: UpdatedBlock[] = [];
    // for (const value of updates.values()) {
    //   updatedBlocks.push(value);
    // }
    // console.log("updatedBlocks", updatedBlocks);
    // saveChanges.mutate(updatedBlocks);
  };

  // const highlight: SerializedBlockHighlightNode = {
  //   type: BLOCK_HIGHLIGHT_TYPE,
  //   version: 1,
  //   content: "",
  //   open: true,
  //   id: crypto.randomUUID(),
  //   indexWithinParent: 0,
  //   highlightText:
  //     "^[5:57 - Be clear](https://youtu.be/17XZGUX_9iM?si=uxGeSlL2kveoDyrM&t=357)",
  //   highlightUrl: "",
  //   highlightRangePath: "",
  //   parentId: null,
  //   direction: "ltr",
  //   format: "",
  //   indent: 0,
  //   children: [],
  // };
  const blockparagraph: SerializedBlockParagraphNode = {
    type: BLOCK_PARAGRAPH_TYPE,
    version: 1,
    content: "",
    open: true,
    id: crypto.randomUUID(),
    indexWithinParent: 0,
    parentId: null,
    direction: "ltr",
    format: "",
    indent: 0,
    children: [],
  };

  const initialConfig = {
    namespace: "MyEditor",
    theme: customTheme,
    onError,
    nodes: [
      BlockHighlightNode,
      BlockQuoteDecorator,
      BlockParagraphNode,
      BlockContainerNode,
      BlockContentNode,
      BlockChildContainerNode,
      BlockNoteNode,
      HeaderNode,
      AutoLinkNode,
      LinkNode,
    ],
    editorState: JSON.stringify({
      root: {
        children: [
          {
            ...blockparagraph,
            type: BLOCK_NOTE_TYPE,
            childBlocks: [
              {
                ...blockparagraph,
                content:
                  "## [Kevin Hale - How to Pitch Your Startup - Y Combinator](https://youtube.com/watch?v=231x3123)",
              },
              { ...blockparagraph, content: "## Hello world2" },
              { ...blockparagraph, content: "### Hello world3" },
              { ...blockparagraph, content: "#### Hello world4" },
              { ...blockparagraph, content: "normal text" },
              { ...blockparagraph, content: "**bold text**" },
            ],
          },
          {
            ...blockparagraph,
            type: BLOCK_NOTE_TYPE,
            childBlocks: [
              { ...blockparagraph, content: "# Hello world1" },
              { ...blockparagraph, content: "## Hello world2" },
              { ...blockparagraph, content: "### Hello world3" },
              { ...blockparagraph, content: "#### Hello world4" },
              { ...blockparagraph, content: "normal text" },
              { ...blockparagraph, content: "**bold text**" },
            ],
          },
        ],
        direction: null,
        type: "root",
        version: 1,
      },
    }),
  };

  return (
    <main className="flex-grow px-[4px] py-5">
      <LexicalComposer initialConfig={initialConfig}>
        <PlainTextPlugin
          contentEditable={
            <div className="editor max-w-3xl" ref={onRef}>
              <ContentEditable />
            </div>
          }
          placeholder={<div>Enter some text...</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HierarchicalBlockPlugin />
        <HistoryPlugin />
        <SelectBlocksPlugin />
        <SendingUpdatesPlugin handleUpdates={handleUpdates} />
        {editorRef ? <DraggableBlockPlugin editorRef={editorRef} /> : <></>}
        {/* <ShortcutsPlugin /> */}
        <TreeViewPlugin />
        <LexicalClickableLinkPlugin />
        <LexicalAutoLinkPlugin />
      </LexicalComposer>
    </main>
  );
}
