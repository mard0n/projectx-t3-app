import type { ParagraphNode } from "lexical";
import type { CPContainerNode, Updates } from ".";

export const selectTopLevelNodes = (nodes: CPContainerNode[]) => {
  const commonAncesstor = nodes.reduce<CPContainerNode | undefined | null>(
    (acc, current) => {
      if (!acc) return current;
      if (acc === current) {
        return acc.getParent();
      }
      return acc.getCommonAncestor(current);
    },
    nodes[0],
  );

  const onlyTopLevelNodes = nodes.filter((node) => {
    return commonAncesstor
      ?.getChildren<ParagraphNode>()
      .some((child) => child.getKey() === node.getKey());
  });

  return onlyTopLevelNodes;
};

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
