import type { Note } from "~/server/db/schema";

// TODO: Refactor utils folder
export function buildHierarchy(items: (Note & { childNotes?: Note[] })[]) {
  const tree: (Note & { childNotes: Note[] })[] = [];
  const mappedArr: Record<string, Note & { childNotes: Note[] }> = {};

  for (const item of items) {
    const id = item.id;
    if (!mappedArr.hasOwnProperty(id)) {
      mappedArr[id] = { ...item, childNotes: [] };
    }
  }

  // Loop over hash table
  for (const id in mappedArr) {
    if (mappedArr.hasOwnProperty(id)) {
      const mappedElem = mappedArr[id]!;

      if (mappedElem?.parentId) {
        const parentId = mappedElem?.parentId;
        const parentNote = mappedArr[parentId];
        if (parentNote) {
          // TODO: Need to find a better way of sorting
          const childNotes = parentNote.childNotes;
          childNotes.push(mappedElem);
          const sortedChildNotes = childNotes.sort(
            (a, b) => a.indexWithinParent! - b.indexWithinParent!,
          );
          parentNote.childNotes = sortedChildNotes;
        }
      } else {
        tree.push(mappedElem);
      }
    }
  }

  return tree.sort((a, b) => a.indexWithinParent! - b.indexWithinParent!); // TODO: Better way of sorting
}
