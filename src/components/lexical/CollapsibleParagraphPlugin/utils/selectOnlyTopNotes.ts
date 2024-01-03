import type { CPContainerNode } from "..";

export const selectOnlyTopNotes = (nodes: CPContainerNode[]) => {
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
      ?.getChildren()
      .some((child) => child.getKey() === node.getKey());
  });

  return onlyTopLevelNodes;
};
