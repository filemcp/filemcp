export default async function globalTeardown() {
  // DB is left intact between runs for debugging; truncation happens in setup.ts per-test
}
