import Link from "next/link";
import Note from "~/components/Note";
import { api } from "~/utils/api";

export default function Notes() {
  const notes = api.note.getAll.useQuery();

  return (
    <div className="flex min-h-screen px-2">
      <aside className="min-w-80 border-r pt-8">
        <Link href="/notes">All notes</Link>
      </aside>
      <main className="flex-grow p-8">
        {notes.data
          ? notes.data.map((note) => <Note key={note.id} {...note} />)
          : null}
      </main>
    </div>
  );
}
