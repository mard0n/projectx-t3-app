import { type RootNode } from "lexical";
import { type BlockChildContainerNode, type BlockContainerNode } from "..";

export const selectOnlyTopNotes = (nodes: BlockContainerNode[]) => {
  const commonAncesstor = nodes.reduce<
    BlockContainerNode | BlockChildContainerNode | RootNode | undefined | null
  >((acc, current) => {
    if (!acc) return current;
    if (acc === current) {
      return acc.getParent<BlockChildContainerNode | RootNode>();
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
