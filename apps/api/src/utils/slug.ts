const ADJECTIVES = ['brave', 'calm', 'dark', 'fast', 'gold', 'jade', 'keen', 'loud', 'pale', 'rich', 'slim', 'tall', 'wild']
const NOUNS = ['atlas', 'cloud', 'delta', 'ember', 'fjord', 'grove', 'haven', 'inlet', 'jetty', 'knoll', 'ledge', 'marsh', 'nexus']

export function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const suffix = Math.floor(Math.random() * 900) + 100
  return `${adj}-${noun}-${suffix}`
}
