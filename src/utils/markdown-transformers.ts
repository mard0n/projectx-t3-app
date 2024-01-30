import type { ElementTransformer, Transformer } from "@lexical/markdown";
import type { ElementNode } from "lexical";
import {
  $createHeaderNode,
  $isHeaderNode,
  HeaderNode,
  type HeaderTagType,
} from "~/nodes/Header/HeaderNode";

const createBlockNode = (
  createNode: (match: Array<string>) => ElementNode,
): ElementTransformer["replace"] => {
  return (parentNode, children, match) => {
    const node = createNode(match);
    node.append(...children);
    parentNode.replace(node);
    node.select(0, 0);
  };
};

export const HEADER: ElementTransformer = {
  dependencies: [HeaderNode],
  export: (node, exportChildren) => {
    console.log("node", node);

    if (!$isHeaderNode(node)) {
      return null;
    }
    const level = Number(node.getTag().slice(1));
    return "#".repeat(level) + " " + exportChildren(node);
  },
  regExp: /^(#{1,6})\s/,
  replace: createBlockNode((match) => {
    const tag = ("h" + match[1]?.length) as HeaderTagType;
    return $createHeaderNode(tag);
  }),
  type: "element",
};

const ELEMENT_TRANSFORMERS: Array<ElementTransformer> = [
  HEADER,
  // QUOTE,
  // CODE,
  // UNORDERED_LIST,
  // ORDERED_LIST,
];

export const CUSTOM_TRANSFORMERS: Array<Transformer> = [
  // TABLE,
  // HR,
  // IMAGE,
  // EMOJI,
  // EQUATION,
  // TWEET,
  // CHECK_LIST,
  ...ELEMENT_TRANSFORMERS,
  // ...TEXT_FORMAT_TRANSFORMERS,
  // ...TEXT_MATCH_TRANSFORMERS,
];
