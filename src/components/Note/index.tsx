import type { FC, ReactNode } from "react";
import type { RouterOutputs, Unpacked } from "~/utils/api";

type NoteGetAllOutput = RouterOutputs["note"]["getAll"];

type NoteProps = object & Unpacked<NoteGetAllOutput>;

const Note: FC<NoteProps> = ({ title }) => {
  return (
    <div>
      <h3>{title}</h3>
    </div>
  );
};

export default Note;
