import type {
  RangeSelection,
  GridSelection,
  ElementNode,
  LexicalNode,
} from "lexical";
import { $isRangeSelection, $setSelection } from "lexical";
import { $findParentCPContainer } from "../BlockContainer";

export function $customSetBlocksType(
  nodes: LexicalNode[],
  createElement: () => ElementNode,
): void {
  // if (selection.anchor.key === "root") {
  //   const element = createElement();
  //   const root = $getRoot();
  //   const firstChild = root.getFirstChild();
  //   if (firstChild) {
  //     firstChild.replace(element, true);
  //   } else {
  //     root.append(element);
  //   }
  //   return;
  // }

  // console.log("containerNodes", containerNodes);
  // const targetElement = createElement();
  // console.log("targetElement", targetElement);
  // console.log("containerNodes[0]", containerNodes[0]);
  // containerNodes[0]?.replace(targetElement,);
  // containerNodes[0]?.selectEnd();

  for (const node of nodes) {
    const targetElement = createElement();
    console.log("targetElement", targetElement);

    // targetElement.setId(node.getId() || crypto.randomUUID());
    // targetElement.setOpen(node.getOpen());
    // targetElement.setDirection(node.getDirection());
    // targetElement.setIndent(node.getIndent());
    // targetElement.setFormat(node.getFormatType());
    console.log("node replace", node);

    node.replace(targetElement, true);
    $setSelection(null);
  }
}
