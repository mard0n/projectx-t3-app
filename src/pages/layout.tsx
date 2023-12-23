import type { FC } from "react";
import Navbar from "~/components/Navbar";

interface LayoutProps {
  children: React.PropsWithChildren;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

export default Layout;
