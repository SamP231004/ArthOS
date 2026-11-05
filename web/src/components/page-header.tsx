export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="animate-fade-up">
        <h1 className="font-display text-4xl tracking-tight sm:text-[2.75rem]">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
