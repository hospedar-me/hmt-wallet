"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { walletStyles } from "./styles.generated";
export function ShadowSurface({
  children,
}: {
  children: (root: HTMLElement) => ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const shadow =
      host.current.shadowRoot || host.current.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = walletStyles;
    const mount = document.createElement("div");
    mount.dataset.hmtRoot = "";
    shadow.replaceChildren(style, mount);
    setRoot(mount);
    return () => {
      shadow.replaceChildren();
    };
  }, []);
  return (
    <div ref={host} data-hmt-wallet="">
      {root && createPortal(children(root), root)}
    </div>
  );
}
