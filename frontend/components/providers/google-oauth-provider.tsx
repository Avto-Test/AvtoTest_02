"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { createContext, useContext } from "react";

const GoogleOAuthClientIdContext = createContext("");

type AppGoogleOAuthProviderProps = {
  children: React.ReactNode;
  clientId: string;
};

export function AppGoogleOAuthProvider({ children, clientId }: AppGoogleOAuthProviderProps) {
  const normalizedClientId = clientId.trim();

  return (
    <GoogleOAuthClientIdContext.Provider value={normalizedClientId}>
      <GoogleOAuthProvider clientId={normalizedClientId || "missing-google-client-id"}>
        {children}
      </GoogleOAuthProvider>
    </GoogleOAuthClientIdContext.Provider>
  );
}

export function useGoogleOAuthClientId() {
  return useContext(GoogleOAuthClientIdContext);
}
