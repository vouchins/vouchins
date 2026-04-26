import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function PublicNavbar() {
  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-20">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="Vouchins"
                width={140}
                height={40}
                className="object-contain"
                priority
              />
            </Link>
            <h1 className="sr-only">Vouchins</h1>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
