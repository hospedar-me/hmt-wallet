// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { HmtWalletWidget } from "../src/react";
import { WalletContext } from "../src/runtime";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "../src/ui/alert-dialog";
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const operations = {} as any;
function mount(node: React.ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return {
    host,
    dispose: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}
it("does not mount or fetch wallet state for production payments", () => {
  const getPayer = vi.fn();
  const view = mount(
    <HmtWalletWidget
      enabled
      environment="production"
      locale="en"
      operations={{ actionGetHmtPayer: getPayer } as any}
    />,
  );
  expect(view.host.childElementCount).toBe(0);
  expect(getPayer).not.toHaveBeenCalled();
  view.dispose();
});
it("owns a ShadowRoot, style sheet and fixed HMT tokens", async () => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  const hostile = document.createElement("style");
  hostile.textContent =
    "button,div { color:red!important;border-radius:0!important;font-size:72px!important; }";
  document.head.append(hostile);
  const view = mount(
    <HmtWalletWidget
      enabled
      environment="homologation"
      locale="en"
      operations={operations}
    />,
  );
  await act(async () => {});
  const host = view.host.querySelector("[data-hmt-wallet]")!;
  expect(host.shadowRoot).not.toBeNull();
  expect(
    /--primary:\s*#315f68/.test(
      host.shadowRoot?.querySelector("style")?.textContent || "",
    ),
  ).toBe(true);
  expect(host.shadowRoot?.querySelector("[data-hmt-root]")).not.toBeNull();
  expect(view.host.querySelector("button")).toBeNull();
  view.dispose();
  hostile.remove();
});
it("places dialog portals inside the wallet root", async () => {
  const container = document.createElement("div");
  const shadow = container.attachShadow({ mode: "open" });
  const target = document.createElement("div");
  shadow.append(target);
  document.body.append(container);
  const view = mount(
    <WalletContext.Provider
      value={{ locale: "en", operations, portalContainer: target }}
    >
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Wallet title</AlertDialogTitle>
          <AlertDialogDescription>Wallet description</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>
    </WalletContext.Provider>,
  );
  await act(async () => {});
  expect(shadow.querySelector("[role=alertdialog]")).not.toBeNull();
  expect(document.body.querySelector("[role=alertdialog]")).toBeNull();
  view.dispose();
  container.remove();
});
