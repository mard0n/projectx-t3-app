// Clipboard may contain files that we aren't allowed to read. While the event is arguably useless,
// in certain occasions, we want to know whether it was a file transfer, as opposed to text. We

import type { PasteCommandType } from "lexical";

// control this with the first boolean flag.
export function eventFiles(
  event: DragEvent | PasteCommandType,
): [boolean, Array<File>, boolean] {
  let dataTransfer: null | DataTransfer = null;
  if (event instanceof DragEvent) {
    dataTransfer = event.dataTransfer;
  } else if (event instanceof ClipboardEvent) {
    dataTransfer = event.clipboardData;
  }

  if (dataTransfer === null) {
    return [false, [], false];
  }

  const types = dataTransfer.types;
  const hasFiles = types.includes("Files");
  const hasContent =
    types.includes("text/html") || types.includes("text/plain");
  return [hasFiles, Array.from(dataTransfer.files), hasContent];
}
