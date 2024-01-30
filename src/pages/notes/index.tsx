import Link from "next/link";
import { api } from "~/utils/api";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { useRef } from "react";
import {
  BlockChildContainerNode,
  BlockContainerNode,
  BlockTextNode,
} from "~/nodes/Block";
import { HierarchicalBlockPlugin } from "~/plugins/HierarchicalBlocksPlugin";
import { DraggableBlockPlugin } from "~/plugins/DraggableBlockPlugin";
import {
  SendingUpdatesPlugin,
  type UpdatedBlock,
  type Updates,
} from "~/plugins/SendingUpdatesPlugin";
import { create } from "zustand";
import { SelectBlocksPlugin } from "~/plugins/SelectBlocksPlugin";
import { ShortcutsPlugin } from "~/plugins/ShortcutsPlugin";
import { BlockHeaderNode } from "~/nodes/BlockHeader";
import TreeViewPlugin from "~/plugins/TreeViewPlugin";
import {
  BLOCK_PARAGRAPH_TYPE,
  BlockParagraphNode,
} from "~/nodes/BlockParagraph";
import { BLOCK_HIGHLIGHT_COMMENT_TYPE } from "~/nodes/BlockHighlightComment";
import { BlockHighlightCommentNode } from "~/nodes/BlockHighlightComment/BlockHighlightCommentNode";
import { HeaderNode } from "~/nodes/Header";
import { BlockHighlightCommentTextNode } from "~/nodes/BlockHighlightComment/BlockHighlightCommentTextNode";
import {
  BLOCK_HIGHLIGHT_PARAGRAPH_TYPE,
  BlockHighlightParagraphNode,
} from "~/nodes/BlockHighlightParagraph/BlockHighlightParagraphNode";
import { BlockHighlightParagraphCommentNode } from "~/nodes/BlockHighlightParagraph/BlockHighlightParagraphCommentNode";
import { BlockHighlightParagraphQuoteNode } from "~/nodes/BlockHighlightParagraph";

type SelectedBlocks = {
  selectedBlocks: BlockContainerNode[] | null;
  setSelectedBlocks: (blocks: BlockContainerNode[] | null) => void;
};

export const useSelectedBlocks = create<SelectedBlocks>()((set) => ({
  selectedBlocks: null,
  setSelectedBlocks: (blocks: BlockContainerNode[] | null) =>
    set(() => ({ selectedBlocks: blocks })),
}));

const theme = {
  blockParagraph: "block-paragraph",
  text: {
    bold: "textBold",
    italic: "textItalic",
    strikethrough: "textStrikethrough",
    underline: "textUnderline",
  },
  block: {
    container: "block-container",
    text: "block-text",
    childContainer: "block-child-container",
  },
  header: {
    h1: "block-h1",
    h2: "block-h2",
    h3: "block-h3",
    h4: "block-h4",
  },
};

function onError(error: Error) {
  console.error(error);
}

export default function Notes() {
  const anchorElemRef = useRef<HTMLDivElement>(null);
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
    console.log("updatedBlocks", updatedBlocks);
    saveChanges.mutate(updatedBlocks);
  };

  const initialConfig = {
    namespace: "MyEditor",
    theme,
    onError,
    nodes: [
      BlockContainerNode,
      BlockTextNode,
      BlockChildContainerNode,
      BlockHeaderNode,
      BlockParagraphNode,
      HeaderNode,
      BlockHighlightCommentNode,
      BlockHighlightCommentTextNode,
      BlockHighlightParagraphNode,
      BlockHighlightParagraphCommentNode,
      BlockHighlightParagraphQuoteNode,
    ],
    editorState: JSON.stringify({
      root: {
        children: [
          {
            children: [],
            type: BLOCK_HIGHLIGHT_PARAGRAPH_TYPE,
            version: 1,
            title: "[]",
            open: true,
            id: crypto.randomUUID(),
            highlightText:
              "# Adding multiple content scripts \n Create a contents directory for multiple content scripts, and add your content scripts there. Make sure their names describe what they do!",
            highlightUrl: "https://google.com",
            highlightRangePath: "",
            childNotes: [
              {
                children: [],
                type: BLOCK_HIGHLIGHT_COMMENT_TYPE,
                version: 1,
                title: "[]",
                childNotes: [],
                open: true,
                id: crypto.randomUUID(),
                highlightText: "directory for multiple",
                highlightUrl: "https://google.com",
                highlightRangePath: "",
              },
              {
                children: [],
                type: BLOCK_HIGHLIGHT_COMMENT_TYPE,
                version: 1,
                title: "[]",
                childNotes: [],
                open: true,
                id: crypto.randomUUID(),
                highlightText: "Adding multiple",
                highlightUrl: "https://google.com",
                highlightRangePath: "",
              },
            ],
          },
          {
            children: [],
            type: BLOCK_PARAGRAPH_TYPE,
            version: 1,
            title: "[]",
            childNotes: [],
            open: true,
            id: crypto.randomUUID(),
          },
        ],
        direction: null,
        type: "root",
        version: 1,
      },
    }),
  };

  return (
    <div className="flex min-h-screen px-2">
      <aside className="min-w-80 border-r pt-8">
        <Link href="/notes">All notes</Link>
      </aside>
      <main className="flex-grow p-8">
        <LexicalComposer initialConfig={initialConfig}>
          <PlainTextPlugin
            contentEditable={
              <div className="editor-scroller">
                <div className="editor" ref={anchorElemRef}>
                  <ContentEditable />
                </div>
              </div>
            }
            placeholder={<div>Enter some text...</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HierarchicalBlockPlugin />
          <HistoryPlugin />
          <SelectBlocksPlugin />
          <SendingUpdatesPlugin handleUpdates={handleUpdates} />
          {anchorElemRef.current ? (
            <DraggableBlockPlugin anchorElem={anchorElemRef.current} />
          ) : (
            <></>
          )}
          <ShortcutsPlugin />
          <TreeViewPlugin />
        </LexicalComposer>
      </main>
    </div>
  );
}
