import Link from "next/link";

export default function Notes() {
  return (
    <div className="flex px-2 min-h-screen">
      <aside className="min-w-80 border-r pt-8">
        <Link href="/notes">All notes</Link>
      </aside>
      <main className="flex-grow p-8">Hello from Notes</main>
    </div>
  );
}
