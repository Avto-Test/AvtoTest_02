"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ChartSize = {
  width: number;
  height: number;
};

type ChartContainerProps = {
  children: React.ReactNode | ((size: ChartSize) => React.ReactNode);
  className?: string;
  minHeight?: number;
};

export function ChartContainer({
  children,
  className,
  minHeight = 320,
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState<ChartSize>({ width: 0, height: minHeight });

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    let frameId = 0;

    const syncSize = () => {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      setSize((current) => {
        if (current.width === width && current.height === height) {
          return current;
        }
        return { width, height };
      });
      setReady(width > 0 && height > 0);
    };

    frameId = window.requestAnimationFrame(() => {
      syncSize();
    });

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        syncSize();
      });
    });

    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("w-full min-w-0 overflow-hidden", className)}
      style={{ minHeight }}
    >
      {ready ? (
        <div className="animate-fade-in h-full min-h-0 w-full">
          {typeof children === "function" ? children(size) : children}
        </div>
      ) : null}
    </div>
  );
}
