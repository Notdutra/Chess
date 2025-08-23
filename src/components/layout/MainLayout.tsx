import React, { ReactNode } from "react";

type MainLayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="layout-container">
      <main>{children}</main>
    </div>
  );
}
