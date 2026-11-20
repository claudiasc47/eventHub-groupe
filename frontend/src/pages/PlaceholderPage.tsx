type PlaceholderPageProps = {
  title: string
  ticket: string
}

// Page provisoire : chaque écran la remplace quand il est implémenté.
export function PlaceholderPage({ title, ticket }: PlaceholderPageProps) {
  return (
    <section>
      <h1>{title}</h1>
      <p>Écran à implémenter ({ticket}).</p>
    </section>
  )
}
