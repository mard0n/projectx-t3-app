import Link from "next/link";
import { api } from "~/utils/api";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";

const theme = {};

function onError(error: Error) {
  console.error(error);
}

export default function Notes() {
  const notes = api.note.getAll.useQuery();

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
  console.log("notes.data", notes.data);

  const initialConfig = {
    namespace: "MyEditor",
    theme,
    onError,
    editorState: JSON.stringify({
      root: {
        children: notes.data ?? [
          {
            children: [],
            direction: null,
            format: "",
            type: "paragraph",
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
        </LexicalComposer>
      </main>
    </div>
  );
}
