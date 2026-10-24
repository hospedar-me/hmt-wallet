"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

const STORAGE_KEY = "hmt-wallet-launcher-position-v1";
const DEFAULT_SIZE = 56;
const DEFAULT_MARGIN = 20;
const DEFAULT_DRAG_THRESHOLD = 6;
const SETTLE_DURATION_MS = 180;

type LauncherSide = "left" | "right";

type StoredLauncherPosition = {
  side: LauncherSide;
  y: number;
};

type Point = {
  x: number;
  y: number;
};

type InteractionState = "idle" | "pressed" | "dragging" | "settling";

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
  dragging: boolean;
} | null;

type UseHmtFloatingLauncherOptions = {
  onActivate: () => void;
  size?: number;
  margin?: number;
  dragThreshold?: number;
};

type UseHmtFloatingLauncherResult = {
  buttonRef: RefObject<HTMLButtonElement | null>;
  interactionState: InteractionState;
  isReady: boolean;
  position: Point;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void;
};

const isLauncherSide = (value: unknown): value is LauncherSide =>
  value === "left" || value === "right";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const getViewportPosition = (
  stored: StoredLauncherPosition | null,
  size: number,
  margin: number,
): Point => {
  const maxX = window.innerWidth - size - margin;
  const maxY = window.innerHeight - size - margin;
  const side = stored?.side ?? "right";
  const x = side === "left" ? margin : maxX;
  const y = clamp(stored?.y ?? maxY, margin, maxY);

  return { x: clamp(x, margin, maxX), y };
};

const readStoredPosition = (): StoredLauncherPosition | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredLauncherPosition>;
    if (!isLauncherSide(parsed.side) || typeof parsed.y !== "number") {
      return null;
    }

    return { side: parsed.side, y: parsed.y };
  } catch {
    return null;
  }
};

const persistPosition = (position: StoredLauncherPosition) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Visual preferences are best-effort only.
  }
};

export const useHmtFloatingLauncher = ({
  onActivate,
  size = DEFAULT_SIZE,
  margin = DEFAULT_MARGIN,
  dragThreshold = DEFAULT_DRAG_THRESHOLD,
}: UseHmtFloatingLauncherOptions): UseHmtFloatingLauncherResult => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<DragState>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storedPositionRef = useRef<StoredLauncherPosition | null>(null);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const [interactionState, setInteractionState] =
    useState<InteractionState>("idle");

  const cancelSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const cancelSuppressClickTimer = useCallback(() => {
    if (suppressClickTimerRef.current) {
      clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = null;
    }
  }, []);

  const suppressNextClick = useCallback(() => {
    suppressClickRef.current = true;
    cancelSuppressClickTimer();
    suppressClickTimerRef.current = setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimerRef.current = null;
    }, 0);
  }, [cancelSuppressClickTimer]);

  const settle = useCallback(
    (point: Point) => {
      const maxX = window.innerWidth - size - margin;
      const maxY = window.innerHeight - size - margin;
      const y = clamp(point.y, margin, maxY);
      const side: LauncherSide =
        point.x + size / 2 < window.innerWidth / 2 ? "left" : "right";
      const nextPosition = {
        x: side === "left" ? margin : maxX,
        y,
      };

      storedPositionRef.current = { side, y };
      persistPosition(storedPositionRef.current);
      setPosition(nextPosition);
      setInteractionState("settling");
      cancelSettleTimer();
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        setInteractionState("idle");
      }, SETTLE_DURATION_MS);
    },
    [cancelSettleTimer, margin, size],
  );

  useLayoutEffect(() => {
    storedPositionRef.current = readStoredPosition();
    setPosition(getViewportPosition(storedPositionRef.current, size, margin));
    setIsReady(true);
  }, [margin, size]);

  useEffect(() => {
    const onResize = () => {
      if (dragRef.current) return;
      setPosition(getViewportPosition(storedPositionRef.current, size, margin));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [margin, size]);

  useEffect(
    () => () => {
      cancelSettleTimer();
      cancelSuppressClickTimer();
    },
    [cancelSettleTimer, cancelSuppressClickTimer],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    cancelSettleTimer();
    cancelSuppressClickTimer();
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      currentX: position.x,
      currentY: position.y,
      dragging: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteractionState("pressed");
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.dragging) {
      if (Math.hypot(deltaX, deltaY) < dragThreshold) return;
      drag.dragging = true;
      setInteractionState("dragging");
    }

    const maxX = window.innerWidth - size - margin;
    const maxY = window.innerHeight - size - margin;
    drag.currentX = clamp(drag.originX + deltaX, margin, maxX);
    drag.currentY = clamp(drag.originY + deltaY, margin, maxY);
    setPosition({ x: drag.currentX, y: drag.currentY });
  };

  const finishPointerInteraction = (
    event: ReactPointerEvent<HTMLButtonElement>,
    canceled: boolean,
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;

    if (drag.dragging) {
      suppressNextClick();
      settle({ x: drag.currentX, y: drag.currentY });
      return;
    }

    if (canceled) {
      suppressNextClick();
    }
    setInteractionState("idle");
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) =>
    finishPointerInteraction(event, false);

  const onPointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) =>
    finishPointerInteraction(event, true);

  const onClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      cancelSuppressClickTimer();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onActivate();
  };

  return {
    buttonRef,
    interactionState,
    isReady,
    position,
    onClick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
};
