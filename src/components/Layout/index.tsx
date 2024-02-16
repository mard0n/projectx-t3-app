import type { FC, ReactNode } from "react";
import Navbar from "~/components/Navbar";
import Sidebar from "../Sidebar";

interface LayoutProps {
  children: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex divide-x min-h-screen">
      <div className="flex">
        <Sidebar />
      </div>
      <div className="flex flex-grow flex-col divide-y">
        <Navbar />
        {children}
      </div>
    </div>
  );
};

export default Layout;
