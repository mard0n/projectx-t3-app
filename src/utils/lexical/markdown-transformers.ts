import type {
  ElementTransformer,
  Transformer,
  TextFormatTransformer,
  TextMatchTransformer,
} from "@lexical/markdown";
import {
  HIGHLIGHT,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  QUOTE,
  CODE,
  UNORDERED_LIST,
  ORDERED_LIST,
} from "@lexical/markdown";
import { $createTextNode, $isTextNode, type ElementNode } from "lexical";
import {
  $createHeaderNode,
  $isHeaderNode,
  HeaderNode,
  type HeaderTagType,
} from "~/nodes/Header/HeaderNode";
import { $createLinkNode, $isLinkNode, LinkNode } from "@lexical/link";

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

export const LINK: TextMatchTransformer = {
  dependencies: [LinkNode],
  export: (node, exportChildren, exportFormat) => {
    if (!$isLinkNode(node)) {
      return null;
    }
    const title = node.getTitle();
    const linkContent = title
      ? `[${node.getTextContent()}](${node.getURL()} "${title}")`
      : `[${node.getTextContent()}](${node.getURL()})`;
    const firstChild = node.getFirstChild();
    // Add text styles only if link has single text node inside. If it's more
    // then one we ignore it as markdown does not support nested styles for links
    if (node.getChildrenSize() === 1 && $isTextNode(firstChild)) {
      return exportFormat(firstChild, linkContent);
    } else {
      return linkContent;
    }
  },
  importRegExp:
    /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))/,
  regExp:
    /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))$/,
  replace: (textNode, match) => {
    const [, linkText, linkUrl, linkTitle] = match;
    const linkNode = $createLinkNode(linkUrl!, { title: linkTitle });
    const linkTextNode = $createTextNode(linkText);
    linkTextNode.setFormat(textNode.getFormat());
    linkNode.append(linkTextNode);
    textNode.replace(linkNode);
  },
  trigger: ")",
  type: "text-match",
};

// export const IMAGE: TextMatchTransformer = {
//   dependencies: [ImageNode],
//   export: (node) => {
//     if (!$isImageNode(node)) {
//       return null;
//     }

//     return `![${node.getAltText()}](${node.getSrc()})`;
//   },
//   importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
//   regExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))$/,
//   replace: (textNode, match) => {
//     const [, altText, src] = match;
//     const imageNode = $createImageNode({
//       altText,
//       maxWidth: 800,
//       src,
//     });
//     textNode.replace(imageNode);
//   },
//   trigger: ')',
//   type: 'text-match',
// };

const ELEMENT_TRANSFORMERS: Array<ElementTransformer> = [
  HEADER,
  QUOTE,
  CODE,
  UNORDERED_LIST,
  ORDERED_LIST,
];
const TEXT_FORMAT_TRANSFORMERS: Array<TextFormatTransformer> = [
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HIGHLIGHT,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
];

const TEXT_MATCH_TRANSFORMERS: Array<TextMatchTransformer> = [LINK];

export const CUSTOM_TRANSFORMERS: Array<Transformer> = [
  // TABLE,
  // HR,
  // IMAGE,
  // EMOJI,
  // EQUATION,
  // TWEET,
  // CHECK_LIST,
  ...ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
];
