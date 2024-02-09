import type { Note } from "~/server/db/schema";

type NoteType = Note & { childBlocks?: Note[] };

// TODO: Refactor utils folder
export function buildHierarchy(items: NoteType[]) {
  const tree: NoteType[] = [];
  const mappedArr: Record<string, NoteType> = {};

  for (const item of items) {
    const id = item.id;
    if (!mappedArr.hasOwnProperty(id)) {
      mappedArr[id] = { ...item, childBlocks: [] };
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
          const childBlocks = parentNote.childBlocks;
          childBlocks?.push(mappedElem);
          const sortedChildNotes = childBlocks?.sort(
            (a, b) => a.indexWithinParent - b.indexWithinParent,
          );
          parentNote.childBlocks = sortedChildNotes;
        }
      } else {
        tree.push(mappedElem);
      }
    }
  }

  return tree.sort((a, b) => a.indexWithinParent - b.indexWithinParent); // TODO: Better way of sorting
}
