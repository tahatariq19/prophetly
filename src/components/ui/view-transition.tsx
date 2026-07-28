import type { ReactNode } from "react";

interface ViewTransitionProps {
  children: ReactNode;
  name?: string;
  default?: string;
  enter?: string;
  exit?: string;
}

// React ViewTransition component with fallback for environment support
export function ViewTransition({ children }: ViewTransitionProps) {
  return <>{children}</>;
}
