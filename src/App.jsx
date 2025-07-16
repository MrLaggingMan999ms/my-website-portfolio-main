import { useState } from "react";
import "./index.css";
import Navbar from "./components/Navbar";
import Profile from "./components/Profile";
import Technologies from "./components/Technologies";
import Projects from "./components/Projects";
import Experience from "./components/Experience";
import Contact from "./components/Contact";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="overflow-x-hidden text-stone-300 antialiased">
      <div className="fixed inset-0 -z-10">
        <div className="relative h-full w-full bg-neutral-950">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right, #4f4f4f2e_1px, transparent_1px), linear-gradient(to_bottom, #8080800a_1px, transparent_1px)] bg-[size:14px_24px]"></div>
          <div className="absolute bottom-0 left-0 right-0 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px__at_50%_300px, #fbfbfb36, #000)]"></div>
        </div>
      </div>
      
      <div className="container mx-auto px-8">
        <Navbar />
        <Profile />
        <Technologies />
        <Projects />
        <Experience />
        <Contact />
      </div>
    </div>
  );
}

export default App;
