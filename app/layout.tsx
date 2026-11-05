import type { ReactNode } from "react";

const Layout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body style={{ background: "#0a0a0a", margin: 0 }}>{children}</body>
  </html>
);

export default Layout;
