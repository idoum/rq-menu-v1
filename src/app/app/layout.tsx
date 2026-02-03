/**
 * Public layout for /app routes
 * This layout does NOT enforce authentication.
 * Auth-protected pages are under (protected) route group.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
