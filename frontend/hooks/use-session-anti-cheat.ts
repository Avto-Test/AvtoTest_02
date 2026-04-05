"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { logViolation, type ViolationLogPayload, type ViolationLogResponse } from "@/api/violations";

type ViolationUpdate = {
  attemptFinished: boolean;
  disqualified: boolean;
  disqualificationReason?: string | null;
  violationCount?: number;
  violationLimit?: number;
  lastEventType: string;
};

type AntiCheatWarning = {
  id: number;
  message: string;
};

type UseSessionAntiCheatOptions = {
  enabled: boolean;
  attemptId: string;
  sessionLabel: string;
  initialViolationCount?: number;
  violationLimit?: number | null;
  onViolationUpdate?: (update: ViolationUpdate) => void;
  onFunctionKeyChoice?: (index: number) => void;
};

const DEDUPE_WINDOW_MS = 1_250;
const SCREENSHOT_COALESCE_MS = 1_500;
const WARNING_VISIBLE_MS = 5_000;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function isScreenshotShortcut(event: KeyboardEvent) {
  const key = event.key;
  const code = event.code;
  const lowerKey = key.toLowerCase();

  return (
    key === "PrintScreen" ||
    code === "PrintScreen" ||
    (event.metaKey && event.shiftKey && ["3", "4", "5", "s"].includes(lowerKey)) ||
    ((event.ctrlKey || event.altKey) && (key === "PrintScreen" || code === "PrintScreen"))
  );
}

export function useSessionAntiCheat({
  enabled,
  attemptId,
  sessionLabel,
  initialViolationCount = 0,
  violationLimit = null,
  onViolationUpdate,
  onFunctionKeyChoice,
}: UseSessionAntiCheatOptions) {
  const [warning, setWarning] = useState<AntiCheatWarning | null>(null);
  const [currentViolationCount, setCurrentViolationCount] = useState(initialViolationCount);

  const warningTimerRef = useRef<number | null>(null);
  const lastViolationRef = useRef<{ group: string; at: number } | null>(null);
  const recentScreenshotAtRef = useRef(0);
  const devtoolsPollRef = useRef<number | null>(null);
  const devtoolsOpenRef = useRef(false);
  const initialUrlRef = useRef<string | null>(null);
  const violationUpdateRef = useRef(onViolationUpdate);
  const functionKeyChoiceRef = useRef(onFunctionKeyChoice);

  useEffect(() => {
    violationUpdateRef.current = onViolationUpdate;
  }, [onViolationUpdate]);

  useEffect(() => {
    functionKeyChoiceRef.current = onFunctionKeyChoice;
  }, [onFunctionKeyChoice]);

  useEffect(() => {
    setCurrentViolationCount(initialViolationCount);
  }, [initialViolationCount]);

  useEffect(() => {
    return () => {
      if (warningTimerRef.current !== null) {
        window.clearTimeout(warningTimerRef.current);
      }
      if (devtoolsPollRef.current !== null) {
        window.clearInterval(devtoolsPollRef.current);
      }
    };
  }, []);

  const pushWarning = useCallback((message: string) => {
    const nextId = Date.now();
    setWarning({ id: nextId, message });
    if (warningTimerRef.current !== null) {
      window.clearTimeout(warningTimerRef.current);
    }
    warningTimerRef.current = window.setTimeout(() => {
      setWarning((current) => (current?.id === nextId ? null : current));
    }, WARNING_VISIBLE_MS);
  }, []);

  const applyViolationResponse = useCallback(
    (eventType: string, response: ViolationLogResponse) => {
      if (typeof response.violation_count === "number") {
        setCurrentViolationCount(response.violation_count);
      }

      violationUpdateRef.current?.({
        attemptFinished: Boolean(response.attempt_finished),
        disqualified: Boolean(response.disqualified),
        disqualificationReason: response.disqualification_reason,
        violationCount: response.violation_count,
        violationLimit: response.violation_limit,
        lastEventType: eventType,
      });
    },
    [],
  );

  const reportViolation = useCallback(
    async ({
      eventType,
      group,
      message,
      details,
      keepalive = false,
      useBeacon = false,
    }: {
      eventType: string;
      group: string;
      message: string;
      details?: Record<string, unknown>;
      keepalive?: boolean;
      useBeacon?: boolean;
    }) => {
      if (!enabled || !attemptId) {
        return;
      }

      const now = Date.now();
      const lastViolation = lastViolationRef.current;
      if (lastViolation && lastViolation.group === group && now - lastViolation.at < DEDUPE_WINDOW_MS) {
        return;
      }
      lastViolationRef.current = { group, at: now };

      if (group === "screenshot") {
        recentScreenshotAtRef.current = now;
      }

      pushWarning(message);

      const payload: ViolationLogPayload = {
        event_type: eventType,
        attempt_id: attemptId,
        details: {
          session: sessionLabel,
          path: typeof window !== "undefined" ? window.location.pathname : null,
          ...details,
        },
      };

      try {
        const response = await logViolation(payload, {
          keepalive,
          useBeacon,
        });
        const penaltyMessage =
          typeof response.coins_penalized === "number" && response.coins_penalized > 0
            ? ` Jarima: -${response.coins_penalized} coin.`
            : response.coin_balance === 0
              ? " Coin balans 0 bo'lgani uchun qo'shimcha jarima qo'llanmadi."
              : "";
        if (typeof response.violation_count === "number") {
          const nextLimit =
            typeof response.violation_limit === "number"
              ? response.violation_limit
              : typeof violationLimit === "number"
                ? violationLimit
                : null;
          pushWarning(
            nextLimit
              ? `${message} Qoidabuzarlik ${response.violation_count}/${nextLimit}.${penaltyMessage}`
              : `${message} Qoidabuzarlik ${response.violation_count}.${penaltyMessage}`,
          );
        } else if (penaltyMessage) {
          pushWarning(`${message}${penaltyMessage}`);
        }
        applyViolationResponse(eventType, response);
      } catch {
        // Best-effort logging only; UI should not break if violation logging fails.
      }
    },
    [applyViolationResponse, attemptId, enabled, pushWarning, sessionLabel, violationLimit],
  );

  useEffect(() => {
    if (!enabled || !attemptId || typeof window === "undefined") {
      return;
    }

    initialUrlRef.current = window.location.href;
    window.history.pushState({ sessionLocked: true }, "", window.location.href);

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      void reportViolation({
        eventType: "page_leave_attempt",
        group: "page-leave",
        message: "Sessiyani tark etish urinishi qayd etildi.",
        keepalive: true,
        useBeacon: true,
        details: { trigger: "beforeunload" },
      });
    };

    const onPopState = () => {
      window.history.pushState({ sessionLocked: true }, "", initialUrlRef.current ?? window.location.href);
      void reportViolation({
        eventType: "navigation_blocked",
        group: "page-leave",
        message: "Test vaqtida boshqa sahifaga o'tish bloklandi.",
        details: { trigger: "popstate" },
      });
    };

    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      void reportViolation({
        eventType: "copy_blocked",
        group: "copy",
        message: "Nusxa olish vaqtincha bloklandi.",
        details: { trigger: "copy" },
      });
    };

    const onCut = (event: ClipboardEvent) => {
      event.preventDefault();
      void reportViolation({
        eventType: "cut_blocked",
        group: "copy",
        message: "Matnni kesib olish bloklandi.",
        details: { trigger: "cut" },
      });
    };

    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      void reportViolation({
        eventType: "paste_blocked",
        group: "copy",
        message: "Joylashtirish bloklandi.",
        details: { trigger: "paste" },
      });
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      void reportViolation({
        eventType: "context_menu_blocked",
        group: "copy",
        message: "Context menu test vaqtida bloklandi.",
        details: { trigger: "contextmenu" },
      });
    };

    const onSelectStart = (event: Event) => {
      event.preventDefault();
    };

    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        selection.removeAllRanges();
        void reportViolation({
          eventType: "selection_blocked",
          group: "copy",
          message: "Matnni belgilash bloklandi.",
          details: { trigger: "selectionchange" },
        });
      }
    };

    const onDragStart = (event: DragEvent) => {
      event.preventDefault();
      void reportViolation({
        eventType: "drag_blocked",
        group: "copy",
        message: "Matn va media ko'chirish bloklandi.",
        details: { trigger: "dragstart" },
      });
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        return;
      }

      const screenshotLinked = Date.now() - recentScreenshotAtRef.current < SCREENSHOT_COALESCE_MS;
      void reportViolation({
        eventType: screenshotLinked ? "screenshot_attempt" : "page_leave_attempt",
        group: screenshotLinked ? "screenshot" : "page-leave",
        message: screenshotLinked
          ? "Screenshot urinish qayd etildi."
          : "Test vaqtida sahifadan chiqish urinishi qayd etildi.",
        keepalive: true,
        useBeacon: !screenshotLinked,
        details: { trigger: "visibilitychange" },
      });
    };

    const onPageHide = () => {
      const screenshotLinked = Date.now() - recentScreenshotAtRef.current < SCREENSHOT_COALESCE_MS;
      void reportViolation({
        eventType: screenshotLinked ? "screenshot_attempt" : "page_leave_attempt",
        group: screenshotLinked ? "screenshot" : "page-leave",
        message: screenshotLinked
          ? "Screenshot urinish qayd etildi."
          : "Test vaqtida sahifani tark etish urinishi qayd etildi.",
        keepalive: true,
        useBeacon: true,
        details: { trigger: "pagehide" },
      });
    };

    const onBlur = () => {
      const screenshotLinked = Date.now() - recentScreenshotAtRef.current < SCREENSHOT_COALESCE_MS;
      void reportViolation({
        eventType: screenshotLinked ? "screenshot_attempt" : "page_leave_attempt",
        group: screenshotLinked ? "screenshot" : "page-leave",
        message: screenshotLinked
          ? "Screenshot urinish qayd etildi."
          : "Test oynasidan chiqish urinishi qayd etildi.",
        details: {
          trigger: "blur",
          visibilityState: document.visibilityState,
        },
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      const lowerKey = key.toLowerCase();

      if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        const functionKeyMatch = /^F([1-4])$/.exec(key);
        if (functionKeyMatch && functionKeyChoiceRef.current) {
          event.preventDefault();
          functionKeyChoiceRef.current(Number(functionKeyMatch[1]) - 1);
          return;
        }
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      const isDevToolsShortcut =
        key === "F12" ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && ["i", "j", "c"].includes(lowerKey)) ||
        ((event.ctrlKey || event.metaKey) && ["u"].includes(lowerKey));

      const isClipboardShortcut =
        (event.ctrlKey || event.metaKey) && ["c", "x", "v", "a", "p"].includes(lowerKey);

      if (isDevToolsShortcut) {
        event.preventDefault();
        event.stopPropagation();
        void reportViolation({
          eventType: "devtools_blocked",
          group: "devtools",
          message: "Developer tools ochish bloklandi.",
          details: { key },
        });
        return;
      }

      if (isClipboardShortcut) {
        event.preventDefault();
        event.stopPropagation();
        void reportViolation({
          eventType: "clipboard_shortcut_blocked",
          group: "copy",
          message: "Nusxa olish yoki joylashtirish bloklandi.",
          details: { key },
        });
        return;
      }

      if (isScreenshotShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        recentScreenshotAtRef.current = Date.now();
        void reportViolation({
          eventType: "screenshot_attempt",
          group: "screenshot",
          message: "Screenshot urinish qayd etildi.",
          details: {
            key,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
          },
        });
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (!isScreenshotShortcut(event)) {
        return;
      }

      recentScreenshotAtRef.current = Date.now();
      void reportViolation({
        eventType: "screenshot_attempt",
        group: "screenshot",
        message: "Screenshot urinish qayd etildi.",
        details: {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          trigger: "keyup",
        },
      });
    };

    const bodyStyle = document.body.style;
    const previousUserSelect = bodyStyle.userSelect;

    bodyStyle.userSelect = "none";

    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("popstate", onPopState);

    devtoolsPollRef.current = window.setInterval(() => {
      const looksOpen =
        Math.abs(window.outerWidth - window.innerWidth) > 180 ||
        Math.abs(window.outerHeight - window.innerHeight) > 180;

      if (looksOpen && !devtoolsOpenRef.current) {
        devtoolsOpenRef.current = true;
        void reportViolation({
          eventType: "devtools_detected",
          group: "devtools",
          message: "Developer tools ochilishi aniqlandi.",
          details: {
            outerWidth: window.outerWidth,
            innerWidth: window.innerWidth,
            outerHeight: window.outerHeight,
            innerHeight: window.innerHeight,
          },
        });
      } else if (!looksOpen) {
        devtoolsOpenRef.current = false;
      }
    }, 1_000);

    return () => {
      bodyStyle.userSelect = previousUserSelect;
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("popstate", onPopState);

      if (devtoolsPollRef.current !== null) {
        window.clearInterval(devtoolsPollRef.current);
        devtoolsPollRef.current = null;
      }
    };
  }, [attemptId, enabled, reportViolation]);

  return {
    warning,
    violationCount: currentViolationCount,
    violationLimit,
  };
}
