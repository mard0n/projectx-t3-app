import Link from "next/link";
import { api } from "~/utils/api";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import type {
  UpdatedBlock,
  Updates,
} from "~/components/lexical/CollapsibleParagraphPlugin";
import {
  CPChildContainerNode,
  CPContainerNode,
  CPTitleNode,
  CollapsibleParagraphPlugin,
} from "~/components/lexical/CollapsibleParagraphPlugin";
import { ParagraphNode } from "lexical";

const theme = {
  paragraph: "custom-paragraph",
  text: {
    bold: "editor-textBold",
    italic: "editor-textItalic",
    strikethrough: "editor-textStrikethrough",
    underline: "editor-textUnderline",
  },
};

function onError(error: Error) {
  console.error(error);
}

export default function Notes() {
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
      CPContainerNode,
      CPTitleNode,
      CPChildContainerNode,
      {
        replace: ParagraphNode,
        with: () => {
          return new CPContainerNode(true); // TODO: add transformer: wherever empty container add title and childContainer
        },
      },
    ],
    editorState: JSON.stringify({
      root: {
        children: notes.data?.length
          ? notes.data
          : [
              {
                children: [],
                direction: null,
                format: "",
                type: "container",
                version: 1,
                title: [],
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
            contentEditable={<ContentEditable />}
            placeholder={<div>Enter some text...</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <CollapsibleParagraphPlugin handleUpdates={handleUpdates} />
        </LexicalComposer>
      </main>
    </div>
  );
}
