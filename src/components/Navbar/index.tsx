import Link from "next/link";
import React from "react";

// interface NavbarProps {}

const Navbar = () => {
  return (
    <div className="flex border-b p-2">
      <div className="min-w-80">Project X</div>
      <div className="px-8">
        <Link href={"/notes"}>Notes</Link>
      </div>
    </div>
  );
};

export default Navbar;
