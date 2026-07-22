import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { Role } from "../auth/types";

interface RequireRoleProps {
  roles: Role[];
  children: ReactNode;
}

// Routenschutz: Admin darf per Vorgabe ueberall rein, wo ein Konstrukteur
// reindarf (Jonas' Vorgabe 2026-07-22: "er kann alle Seiten sehen, auch
// Seiten eines Konstrukteurs") - deshalb ist "admin" implizit immer erlaubt.
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user } = useAuth();
  if (!user || (!roles.includes(user.role) && user.role !== "admin")) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
