import { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-slate-100 rounded-3xl p-6 shadow-sm",
        hover && "transition-all duration-300 hover:shadow-md hover:scale-[1.01] cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
