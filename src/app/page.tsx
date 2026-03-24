export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="glass-card px-8 py-6 text-center">
        <p className="font-mono text-ticker text-brand-400 uppercase tracking-widest mb-2">
          System online
        </p>
        <h1 className="text-2xl font-semibold text-white">
          PokéAlpha Terminal
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          The Bloomberg of Pokémon Cards
        </p>
      </div>
    </main>
  )
}