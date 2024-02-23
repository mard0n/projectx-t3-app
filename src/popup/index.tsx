import type { PlasmoGetStyle } from "plasmo";
import cssText from "data-text:~/popup/style.module.css";
import style from "./style.module.css";

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

function IndexPopup() {
  return <h1 className={style.header}>Hello world</h1>;
}

export default IndexPopup;
