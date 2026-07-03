"use client";

import { usePathname } from "next/navigation";
import { OlebotHeader } from "./OlebotHeader";

export function OlebotShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const showHeader = !path.startsWith("/v/");

  return (
    <>
      {showHeader && <OlebotHeader />}
      {children}
    </>
  );
}
