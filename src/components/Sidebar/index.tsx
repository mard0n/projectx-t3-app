import Link from "next/link";
import React from "react";

// interface NavbarProps {}

const Sidebar = () => {
  return (
    <div className="flex w-80 flex-col px-8 py-5 gap-4">
      <Link href={"/notes"}>Notes</Link>
      <Link href={"/projects"}>Projects</Link>
    </div>
  );
};

export default Sidebar;
