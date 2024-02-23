import { useState } from "react";
import style from "./style.module.css"

export function Main({ name = "Extension" }) {
  const [data, setData] = useState("");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        width: 200,
      }}
    >
      <h1 className={style.header}>
        Welcome to your <a href="https://www.plasmo.com">Plasmo</a> {name}!
      </h1>
      <input onChange={(e) => setData(e.target.value)} value={data} />

      <a href="https://docs.plasmo.com">READ THE DOCS!</a>
    </div>
  );
}
