import Link from "next/link";
import { api } from "~/utils/api";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { useRef } from "react";
import {
  type UpdatedBlock,
  type Updates,
} from "~/plugins/SendingUpdatesPlugin";
import TreeViewPlugin from "~/plugins/TreeViewPlugin";
import { customTheme } from "~/utils/lexical/theme";
import {
  CONTAINER_TYPE,
  BlockChildContainerNode,
  BlockContainerNode,
  BlockContentNode,
} from "~/nodes/Block";
import { HierarchicalBlockPlugin } from "~/plugins/HierarchicalBlocksPlugin";
import { SelectBlocksPlugin } from "~/plugins/SelectBlocksPlugin";
import { HeaderNode } from "~/nodes/Header";

function onError(error: Error) {
  console.error(error);
}

export default function Notes() {
  const anchorElemRef = useRef<HTMLDivElement>(null);
  // const notes = api.note.getAll.useQuery(undefined, {
  //   refetchOnWindowFocus: false,
  // });
  // const saveChanges = api.note.saveChanges.useMutation();

  // if (notes.isLoading) {
  //   return (
  //     <div className="flex min-h-screen px-2">
  //       <aside className="min-w-80 border-r pt-8">
  //         <Link href="/notes">All notes</Link>
  //       </aside>
  //       <main className="flex-grow p-8">Loading...</main>
  //     </div>
  //   );
  // }

  // if (notes.isError) {
  //   <div className="flex min-h-screen px-2">
  //     <aside className="min-w-80 border-r pt-8">
  //       <Link href="/notes">All notes</Link>
  //     </aside>
  //     <main className="flex-grow p-8">Failed. Try again later</main>
  //   </div>;
  // }

  // const handleUpdates = (updates: Updates) => {
  //   const updatedBlocks: UpdatedBlock[] = [];
  //   for (const value of updates.values()) {
  //     updatedBlocks.push(value);
  //   }
  //   console.log("updatedBlocks", updatedBlocks);
  //   saveChanges.mutate(updatedBlocks);
  // };

  const initialConfig = {
    namespace: "MyEditor",
    theme: customTheme,
    onError,
    nodes: [BlockContainerNode, BlockContentNode, BlockChildContainerNode, HeaderNode],
    editorState: JSON.stringify({
      root: {
        children: [
          {
            type: CONTAINER_TYPE,
            version: 1,
            content: "# Hello world",
            open: true,
            id: crypto.randomUUID(),
            childNotes: [
              //   {
              //     children: [],
              //     type: BLOCK_HIGHLIGHT_SLICE_TYPE,
              //     version: 1,
              //     title:
              //       '[{"detail":0,"format":0,"mode":"normal","style":"","text":"this is what I think about adding multiple","type":"text","version":1}]',
              //     childNotes: [],
              //     open: true,
              //     id: crypto.randomUUID(),
              //     highlightText: "Adding multiple",
              //     highlightUrl: "https://google.com",
              //     highlightRangePath: "",
              //     highlightIndexWithPage: 1,
              //   },
              //   {
              //     children: [],
              //     type: BLOCK_HIGHLIGHT_SLICE_TYPE,
              //     version: 1,
              //     title: "[]",
              //     childNotes: [],
              //     open: true,
              //     id: crypto.randomUUID(),
              //     highlightText: "directory for multiple",
              //     highlightUrl: "https://google.com",
              //     highlightRangePath: "",
              //     highlightIndexWithPage: 1,
              //   },
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
          {/* <SendingUpdatesPlugin handleUpdates={handleUpdates} /> */}
          {/* {anchorElemRef.current ? (
            <DraggableBlockPlugin anchorElem={anchorElemRef.current} />
          ) : (
            <></>
          )} */}
          {/* <ShortcutsPlugin /> */}
          <TreeViewPlugin />
        </LexicalComposer>
      </main>
    </div>
  );
}
