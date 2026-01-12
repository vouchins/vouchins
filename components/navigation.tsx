'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, LogOut, Shield, User } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface NavigationProps {
  user: {
    first_name: string;
    email: string;
    city: string;
    is_admin: boolean;
    company: {
      name: string;
    };
  };
}

export function Navigation({ user }: NavigationProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-neutral-700" />
            <h1 className="text-xl font-semibold text-neutral-900">
              Vouchins
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {user.is_admin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin')}
                className="text-neutral-600 hover:text-neutral-900"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-neutral-900">
                      {user.first_name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {user.company.name} · {user.city}
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-neutral-600" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.first_name}</p>
                  <p className="text-xs text-neutral-500">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
