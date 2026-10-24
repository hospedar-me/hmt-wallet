"use client";
import { translateUi } from "../i18n";
import { useLocale as useCopyLocale } from "../runtime";

import { WalletCards } from "lucide-react";
import { cn } from "../ui/utils";
import { useHmtFloatingLauncher } from "../hooks/useHmtFloatingLauncher";

type HmtFloatingLauncherProps = {
  expanded: boolean;
  onActivate: () => void;
};

export const HmtFloatingLauncher = ({
  expanded,
  onActivate,
}: HmtFloatingLauncherProps) => {
  const copyLocale = useCopyLocale();
  const {
    buttonRef,
    interactionState,
    isReady,
    position,
    onClick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useHmtFloatingLauncher({ onActivate });

  const isDragging = interactionState === "dragging";
  const isPressed = interactionState === "pressed";
  const isSettling = interactionState === "settling";

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-0 top-0",
        isDragging
          ? "transition-none"
          : "transition-transform duration-200 ease-out",
        "motion-reduce:transition-none",
      )}
      style={{
        opacity: isReady ? 1 : 0,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={translateUi(
          copyLocale,
          "HmtFloatingLauncher.abrirHMTWallet",
        )}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        className={cn(
          "pointer-events-auto relative flex size-14 touch-none select-none items-center justify-center rounded-full",
          "border border-white/20 bg-[var(--graphite)] text-white shadow-md",
          "outline-none transition-[scale,box-shadow,background-color] duration-150",
          "hover:scale-105 hover:bg-[var(--ocean)] hover:shadow-md",
          "focus-visible:ring-2 focus-visible:ring-[var(--champagne)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--off-white)]",
          "motion-reduce:transition-none motion-reduce:hover:scale-100",
          isDragging && "cursor-grabbing scale-105 bg-[var(--ocean)] shadow-md",
          !isDragging && "cursor-grab",
          isPressed && "scale-95",
          isSettling && "scale-100",
        )}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <span
          aria-hidden="true"
          className="absolute inset-1 rounded-full border border-white/10"
        />
        <WalletCards className="relative size-6" strokeWidth={1.8} />
      </button>
    </div>
  );
};
