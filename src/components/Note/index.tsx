import type { FC, ReactNode } from "react";
import type { RouterOutputs } from "~/utils/api";

type Unpacked<T> = T extends (infer U)[] ? U : T;

type PostByIdInput = RouterOutputs["note"]["getAll"];

type NoteProps = object & Unpacked<PostByIdInput>

const Note: FC<NoteProps> = ({ title }) => {
  return (
    <div>
      <h3>{title}</h3>
    </div>
  );
};

export default Note;
