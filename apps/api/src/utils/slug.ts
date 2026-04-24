const ADJECTIVES = ['brave', 'calm', 'dark', 'fast', 'gold', 'jade', 'keen', 'loud', 'pale', 'rich', 'slim', 'tall', 'wild']
const NOUNS = ['atlas', 'cloud', 'delta', 'ember', 'fjord', 'grove', 'haven', 'inlet', 'jetty', 'knoll', 'ledge', 'marsh', 'nexus']

export function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const suffix = Math.floor(Math.random() * 900) + 100
  return `${adj}-${noun}-${suffix}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) // keep URLs reasonable
}
