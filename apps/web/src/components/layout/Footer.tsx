// ============================================================
// Footer.tsx — Pie minimalista
// ============================================================

export function Footer() {
  return (
    <footer className="border-t bg-background py-6">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ·{" "}
        {import.meta.env.VITE_APP_NAME || "React Startup Base"}
      </div>
    </footer>
  );
}
