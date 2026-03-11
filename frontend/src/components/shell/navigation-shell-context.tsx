"use client";

import { createContext, useContext } from "react";

const NavigationShellContext = createContext(false);

export function NavigationShellProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavigationShellContext.Provider value>
      {children}
    </NavigationShellContext.Provider>
  );
}

export function useNavigationShell(): boolean {
  return useContext(NavigationShellContext);
}
