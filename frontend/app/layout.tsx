import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import { ExperimentProvider } from "@/components/providers/experiment-provider";
import { FeatureAccessProvider } from "@/components/providers/feature-access-provider";
import { AppGoogleOAuthProvider } from "@/components/providers/google-oauth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { themeStyleText } from "@/styles/theme";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "AUTOTEST",
  description: "AUTOTEST driving theory preparation platform.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";

  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <style id="autotest-theme-tokens" dangerouslySetInnerHTML={{ __html: themeStyleText }} />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppGoogleOAuthProvider clientId={googleClientId}>
            <AuthProvider>
              <FeatureAccessProvider>
                <ExperimentProvider>{children}</ExperimentProvider>
              </FeatureAccessProvider>
            </AuthProvider>
          </AppGoogleOAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
