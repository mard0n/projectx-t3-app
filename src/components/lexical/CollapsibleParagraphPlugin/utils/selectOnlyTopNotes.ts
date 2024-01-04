import { type RootNode } from "lexical";
import { type CPChildContainerNode, type CPContainerNode } from "..";

export const selectOnlyTopNotes = (nodes: CPContainerNode[]) => {
  const commonAncesstor = nodes.reduce<
    CPContainerNode | CPChildContainerNode | RootNode | undefined | null
  >((acc, current) => {
    if (!acc) return current;
    if (acc === current) {
      return acc.getParent<CPChildContainerNode | RootNode>();
    }

    return acc.getCommonAncestor(current);
  }, nodes[0]);

  if (!commonAncesstor) return [];

  const onlyTopLevelNodes = nodes.filter((node) => {
    return commonAncesstor
      .getChildren()
      .some((child) => child.getKey() === node.getKey());
  });

  return onlyTopLevelNodes;
};
