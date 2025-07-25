import React from "react";
import logo from "../assets/LLogo.png";
import { FaGoogle } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa";
import { FaGithub } from "react-icons/fa";
import { FaDiscord } from "react-icons/fa";
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
          href="https://www.youtube.com/@mrlaggingman999ms"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Youtube"
        >
          <FaYoutube />
        </a>
        <a
          href="https://github.com/MrLaggingMan999ms"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <FaGithub />
        </a>
        <a
          href="https://discord.com/users/1037734268467695667"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Discord"
        >
          <FaDiscord />
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
