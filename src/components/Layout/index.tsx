import type { FC, ReactNode } from "react";
import Navbar from "~/components/Navbar";

interface LayoutProps {
  children: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-grow flex-col divide-y">
      <nav className="px-6 py-5">
        <div className="m-auto w-full max-w-4xl pl-9">
          <Navbar />
        </div>
      </nav>
      <main className="flex-grow px-6 py-5">
        <div className="m-auto w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
