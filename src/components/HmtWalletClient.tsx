"use client";

import { useEffect, useState } from "react";
import { HmtDrawer } from "./HmtDrawer";
import { HmtFloatingLauncher } from "./HmtFloatingLauncher";
import type { HmtWalletView } from "./views/HmtWalletHomeView";

export const HmtWalletClient = () => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<HmtWalletView>("home");

  useEffect(() => {
    const url = new URL(window.location.href);
    const authStatus = url.searchParams.get("hmtAuth");
    if (!authStatus) return;

    setOpen(true);
    url.searchParams.delete("hmtAuth");
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-0 z-[60] ${open ? "hidden" : ""}`}
      >
        <HmtFloatingLauncher expanded={open} onActivate={() => setOpen(true)} />
      </div>
      <HmtDrawer
        open={open}
        view={view}
        onViewChange={setView}
        onOpenChange={setOpen}
      />
    </>
  );
};
