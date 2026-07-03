"use client";

import { usePathname } from "next/navigation";
import { OlebotHeader } from "./OlebotHeader";

export function OlebotShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const showHeader = !path.startsWith("/v/");

  return (
    <div className={showHeader ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden" : undefined}>
      {showHeader && <OlebotHeader />}
      <div className={showHeader ? "flex min-h-0 flex-1 flex-col overflow-hidden" : undefined}>
        {children}
      </div>
    </div>
  );
}
