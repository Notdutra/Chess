import React, { ReactNode } from "react";

type MainLayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function MainLayout({ children, title = "Chess Game" }: MainLayoutProps) {
  return (
    <div className="layout-container">
      <header>
        <h1>{title}</h1>
      </header>
      <main>{children}</main>
      <footer>
        <p>© 2025 Chess Game</p>
      </footer>
    </div>
  );
}
