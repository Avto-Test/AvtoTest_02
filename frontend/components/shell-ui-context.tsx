"use client";

import { createContext, useContext } from "react";

type ShellUiContextValue = {
  setFocusMode: (value: boolean) => void;
};

const ShellUiContext = createContext<ShellUiContextValue | null>(null);

export function ShellUiProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ShellUiContextValue;
}) {
  return <ShellUiContext.Provider value={value}>{children}</ShellUiContext.Provider>;
}

export function useShellUi() {
  return useContext(ShellUiContext);
}
