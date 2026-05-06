import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your Vouchins account today. Join the private marketplace for verified corporate professionals to buy, sell, and connect safely.",
  openGraph: {
    title: "Sign Up | Vouchins",
    description: "Create your Vouchins account today. Join the private marketplace for verified corporate professionals.",
    url: "https://www.vouchins.com/signup",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
