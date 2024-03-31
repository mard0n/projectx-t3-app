import React from "react";

// interface NavbarProps {}

const Navbar = () => {

  return (
    <div className="flex items-center justify-between text-2xl font-medium">
      <svg
        width="115"
        height="25"
        viewBox="0 0 115 25"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M95 25L70 25L82.5 12.5L95 0L95 25Z" fill="#8477AB" />
        <path d="M70 25L70 0L82.5 12.5L95 25L70 25Z" fill="#B4A7C9" />
        <rect x="105" width="10" height="25" fill="#B4A7C9" />
        <rect
          x="60"
          y="25"
          width="10"
          height="25"
          transform="rotate(-180 60 25)"
          fill="#B4A7C9"
        />
        <rect
          x="60"
          y="15"
          width="10"
          height="25"
          transform="rotate(90 60 15)"
          fill="#8477AB"
        />
        <rect x="35" width="10" height="25" fill="#B4A7C9" />
        <rect
          y="11"
          width="11"
          height="17"
          transform="rotate(-90 0 11)"
          fill="#8477AB"
        />
        <circle cx="17" cy="8" r="8" fill="#8477AB" />
        <path d="M0 25L-1.09278e-06 0L12.5 12.5L25 25L0 25Z" fill="#B4A7C9" />
      </svg>

      {/* <Breadcrumb /> */}
      <div id="add-new-note-button"></div>
    </div>
  );
};

export default Navbar;
