interface PlaceholderPageProps {
  title: string
  desc: string
}

export function PlaceholderPage({ title, desc }: PlaceholderPageProps): JSX.Element {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground">{desc}</p>
      <div className="mt-8 rounded-xl border border-dashed bg-card/50 p-12 text-center text-sm text-muted-foreground">
        Bu ekran sonraki sprintte doldurulacak.
      </div>
    </div>
  )
}
