// import "./style.css";
import { Readability } from "@mozilla/readability";
import { type PlasmoCSConfig } from "plasmo";
import { getSelectionContextRange, getUrlFragment } from "~/utils/extension";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_idle",
};

function Extractor() {
  const handleExtract = () => {
    console.log("extract");
    // console.log("document", document);
    // const documentClone = document.cloneNode(true);
    // console.log("documentClone", documentClone);
    // const article = new Readability(documentClone as Document).parse();
    // console.log("article", article);
    // if (article?.content) {
    //   document.body.innerHTML = article.content;
    // }
    // const mainArticleText = article?.textContent
    // console.log("mainArticleText", mainArticleText);
    const selection = window.getSelection();
    // const selectionText = window.getSelection()?.toString()
    // console.log("selectionText", selectionText);

    // if (!selectionText) return;
    // const result = mainArticleText?.match(new RegExp(selectionText, 'm'));

    // console.log("result", result);
    const range = getSelectionContextRange(selection!);
    if (!range) return;
    const urlFrag = getUrlFragment(range);
    console.log("urlFrag", urlFrag);
  };
  return (
    <button
      className="flex w-60 cursor-pointer flex-col divide-y p-4 text-base"
      onClick={handleExtract}
    >
      extract text
    </button>
  );
}

export default Extractor;

<div>
  <p>Ratione iusto facilis quae consectetur.</p>
  <p>
    Lorem ipsum dolor sit amet [consectetur adipisicing elit.{" "}
    <em>Aut, voluptatum!</em>
  </p>
  <p>
    Exercitationem odit, rem labore hic et, <a href="">temporibus</a> ipsam enim
    alias voluptatibus esse incidunt beatae ab repellendus?
  </p>
  <p>Ex in soluta vitae]laborum!</p>
</div>;
