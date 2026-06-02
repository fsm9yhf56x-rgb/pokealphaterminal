require('dotenv').config({ path: '.env.production.local' });
const KEY = process.env.POKEMON_PRICE_TRACKER_API_KEY;

(async () => {
  console.log('=== Test PPT /sets avec differentes langues ===\n');

  for (const lang of ['english', 'japanese', 'french']) {
    console.log(`\n--- language=${lang} ---`);
    const r = await fetch(`https://www.pokemonpricetracker.com/api/v2/sets?language=${lang}`, {
      headers: { Authorization: 'Bearer ' + KEY }
    });
    const j = await r.json();
    const sets = j.data || [];

    const now = new Date();
    const upcoming = sets.filter(s => {
      const d = s.releaseDate ? new Date(s.releaseDate) : null;
      return d && d > now;
    });
    const recent = sets
      .filter(s => s.releaseDate)
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
      .slice(0, 5);

    console.log(`Total sets: ${sets.length}`);
    console.log(`Upcoming: ${upcoming.length}`);
    upcoming.forEach(s => console.log(`  - ${s.name} | ${s.releaseDate?.slice(0,10)} | cards=${s.cardCount}`));

    console.log(`\n5 plus recents:`);
    recent.forEach(s => console.log(`  - ${s.name.padEnd(40)} | ${s.releaseDate?.slice(0,10)} | cards=${s.cardCount}`));
  }
})();
