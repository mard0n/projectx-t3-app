"use cient";
import { api } from "~/utils/api";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { useState } from "react";
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
import {
  BLOCK_NOTE_TYPE,
  BlockNoteNode,
  type SerializedBlockNoteNode,
} from "~/nodes/BlockNote";
import {
  BlockTextContentNode,
  BLOCK_TEXT_TYPE,
  BlockTextNode,
  type SerializedBlockTextNode,
} from "~/nodes/BlockText";
import { SelectBlocksPlugin } from "~/plugins/SelectBlocksPlugin";
import { DraggableBlockPlugin } from "~/plugins/DraggableBlockPlugin";
import {
  BlockHighlightContentNode,
  BlockHighlightNode,
  BlockQuoteDecoratorNode,
} from "~/nodes/BlockHighlight";
import Link from "next/link";
import {
  BlockLinkContentNode,
  BlockLinkDecoratorNode,
  BlockLinkNode,
} from "~/nodes/BlockLink";
import { AddNewBlockPlugin } from "~/plugins/AddNewBlockPlugin";
import { type SerializedTextNode } from "lexical";

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
    const updatedBlocks: UpdatedBlock[] = [];
    for (const value of updates.values()) {
      updatedBlocks.push(value);
    }
    saveChanges.mutate(updatedBlocks);
  };

  const note: SerializedBlockNoteNode = {
    type: BLOCK_NOTE_TYPE,
    version: 1,
    id: crypto.randomUUID(),
    indexWithinParent: 0,
    children: [],
    direction: null,
    format: "",
    indent: 0,
  };

  const blockparagraph: SerializedBlockTextNode = {
    type: BLOCK_TEXT_TYPE,
    version: 1,
    open: true,
    id: crypto.randomUUID(),
    indexWithinParent: 0,
    parentId: "",
    children: [],
    direction: null,
    format: "",
    indent: 0,
    webUrl: null,
    properties: {
      content: "[]",
      tag: "p",
    },
  };

  const initialConfig = {
    namespace: "MyEditor",
    theme: customTheme,
    onError,
    nodes: [
      BlockNoteNode,
      BlockContainerNode,
      BlockContentNode,
      BlockChildContainerNode,
      BlockTextNode,
      BlockTextContentNode,
      BlockHighlightNode,
      BlockHighlightContentNode,
      BlockQuoteDecoratorNode,
      BlockLinkNode,
      BlockLinkContentNode,
      BlockLinkDecoratorNode,
      // AutoLinkNode,
      // LinkNode,
    ],
    editorState: JSON.stringify({
      root: {
        children: notes?.data?.length
          ? notes.data
          : [
              {
                ...note,
                childBlocks: [blockparagraph],
              },
            ],
        direction: null,
        type: "root",
        version: 1,
      },
    }),
  };

  return (
    <main className="flex-grow px-6 py-5">
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
        {/* <LexicalClickableLinkPlugin /> */}
        {/* <LexicalAutoLinkPlugin /> */}
      </LexicalComposer>
    </main>
  );
}
