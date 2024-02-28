/* eslint-disable @typescript-eslint/prefer-for-of */
import {
  $isElementNode,
  $isRootNode,
  type ElementNode,
  type LexicalNode,
  type PasteCommandType,
  type RootNode,
} from "lexical";
import { z } from "zod";
import type { Updates } from "~/plugins/SendingUpdatesPlugin";

export function hasToggleElemClicked(e: MouseEvent): boolean {
  const target: HTMLElement | undefined | null = (e.currentTarget ??
    e.target) as HTMLElement;
  if (!target) return false;

  const toggleBtn = getComputedStyle(target, ":after");
  if (!toggleBtn) return false;
  // Then we parse out the dimensions
  const atop = Number(toggleBtn.getPropertyValue("top").slice(0, -2));
  const aleft = Number(toggleBtn.getPropertyValue("left").slice(0, -2));
  const aborderTopWidth = Number(
    toggleBtn.getPropertyValue("border-top-width").slice(0, -2),
  );
  const aborderBottomWidth = Number(
    toggleBtn.getPropertyValue("border-bottom-width").slice(0, -2),
  );
  const aborderLeftWidth = Number(
    toggleBtn.getPropertyValue("border-left-width").slice(0, -2),
  );
  const aborderRightWidth = Number(
    toggleBtn.getPropertyValue("border-right-width").slice(0, -2),
  );

  const bbox = target.getBoundingClientRect();
  const ex = e.clientX - bbox.left;
  const ey = e.clientY - bbox.top;
  if (
    ex >= aleft - 4 &&
    ex <= aleft + aborderLeftWidth + aborderRightWidth + 4 &&
    ey >= atop - 4 &&
    ey <= atop + aborderTopWidth + aborderBottomWidth + 4
  ) {
    return true;
  }
  return false;
}

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

export function selectOnlyTopNodes<T extends LexicalNode = LexicalNode>(
  nodes: T[],
): T[] {
  const commonAncesstor = nodes.reduce<
    LexicalNode | ElementNode | RootNode | undefined | null
  >((acc, current) => {
    if (!acc) return current;
    if (acc === current) {
      return acc.getParent<ElementNode | RootNode>();
    }

    return acc.getCommonAncestor(current);
  }, nodes[0]);

  if (!commonAncesstor) return [];

  const onlyTopLevelNodes = nodes.filter((node) => {
    if ($isElementNode(commonAncesstor) || $isRootNode(commonAncesstor)) {
      return commonAncesstor
        .getChildren()
        .some((child) => child.getKey() === node.getKey());
    }
    return false;
  });

  return onlyTopLevelNodes;
}

export const throttle = (
  fn: (updates: Updates, updatesRef: React.MutableRefObject<Updates>) => void,
  wait = 300,
) => {
  let inThrottle: boolean,
    lastFn: ReturnType<typeof setTimeout>,
    lastTime: number;

  return function (args: Updates, updatesRef: React.MutableRefObject<Updates>) {
    if (!inThrottle) {
      fn(args, updatesRef);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(
        () => {
          if (Date.now() - lastTime >= wait) {
            fn(args, updatesRef);
            lastTime = Date.now();
          }
        },
        Math.max(wait - (Date.now() - lastTime), 0),
      );
    }
  };
};

export const SerializedLexicalNodeSchema = z.object({
  type: z.string(),
  version: z.number(),
});

export const SerializedElementNodeSchema = z
  .object({
    children: z.array(SerializedLexicalNodeSchema),
    direction: z.union([z.literal("ltr"), z.literal("rtl")]).nullable(),
    format: z.union([
      z.literal("left"),
      z.literal("start"),
      z.literal("center"),
      z.literal("right"),
      z.literal("end"),
      z.literal("justify"),
      z.literal(""),
    ]),
    indent: z.number(),
  })
  .merge(SerializedLexicalNodeSchema);
