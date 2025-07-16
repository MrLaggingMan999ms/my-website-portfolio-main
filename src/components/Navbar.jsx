import React from "react";
import logo from "../assets/LLogo.png";
import { FaGoogle } from "react-icons/fa";
const Navbar = () => {
  return (
    <nav className="flex items-center justify-between py-6">
      <div className="flex flex-shrink-0 items-center">
        <a href="/" aria-label="Home">
          <img src={logo} className="mx-2" width={50} height={33} alt="Logo" />
        </a>
      </div>
      <div className="m-8 flex item-center justify-center gap-4 text-2xl">
        <a
          href="https://www.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Google"
        >
          <FaGoogle />
        </a>
        <a        
          href="https://www.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Google"
        >
          <FaGoogle />
        </a>
        <a
          href="https://www.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Google"
        >
          <FaGoogle />
        </a>
        <a
          href="https://www.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Google"
        >
          <FaGoogle />
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
