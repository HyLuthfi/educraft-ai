export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div
        className="radial-glow radial-glow-primary"
        style={{ top: "-20%", left: "10%" }}
      />
      <div
        className="radial-glow radial-glow-accent"
        style={{ bottom: "-10%", right: "15%" }}
      />
      <div className="relative z-10 w-full max-w-md px-6">{children}</div>
    </div>
  )
}
