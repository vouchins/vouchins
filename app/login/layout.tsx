import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your Vouchins account to access the verified corporate marketplace and network with your trusted colleagues.",
  openGraph: {
    title: "Log In | Vouchins",
    description: "Log in to your Vouchins account to access the verified corporate marketplace.",
    url: "https://www.vouchins.com/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
