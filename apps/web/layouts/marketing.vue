<script setup lang="ts">
const route = useRoute()

// Header is transparent at the top of the home page (lets the hero glow
// shine through cleanly), then becomes a blurred backdrop once you scroll.
// Inner marketing pages always show the backdrop.
const isHome = computed(() => route.path === '/')
const scrolled = ref(false)

onMounted(() => {
  const onScroll = () => { scrolled.value = window.scrollY > 8 }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
})

const accountLinks = [
  { label: 'Get started', to: '/register' },
  { label: 'Sign in', to: '/login' },
]

const communityLinks = [
  // TODO(ara): replace with real Discord invite URL
  { label: 'Discord', href: 'https://discord.gg/hRVhz5WTpe' },
  { label: 'GitHub', href: 'https://github.com/filemcp/filemcp' },
]

const legalLinks = [
  { label: 'Terms of Use', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
]

const year = new Date().getFullYear()
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white flex flex-col overflow-x-clip">
    <!-- ===== Header ===== -->
    <header
      :class="[
        'sticky top-0 z-40 transition-all duration-300 border-b',
        isHome && !scrolled
          ? 'bg-transparent border-transparent'
          : 'bg-zinc-950/85 backdrop-blur-md border-zinc-900',
      ]"
    >
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center select-none">
          <img src="/logo.png" alt="FileMCP" class="h-8 w-auto mix-blend-screen" />
        </NuxtLink>

        <nav class="flex items-center gap-1 sm:gap-2">
          <a
            href="https://github.com/filemcp/filemcp"
            target="_blank"
            rel="noopener"
            class="hidden sm:inline-flex p-2 text-zinc-400 hover:text-white transition rounded-md hover:bg-zinc-900"
            aria-label="GitHub"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.18-.02-2.14-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.79-.01 3.16 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
            </svg>
          </a>
          <a
            href="https://discord.gg/hRVhz5WTpe"
            target="_blank"
            rel="noopener"
            class="hidden sm:inline-flex p-2 text-zinc-400 hover:text-white transition rounded-md hover:bg-zinc-900"
            aria-label="Discord"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.32 4.37A19.79 19.79 0 0 0 16.05 3a13.6 13.6 0 0 0-.65 1.32 18.27 18.27 0 0 0-5.5 0A13.6 13.6 0 0 0 9.25 3a19.79 19.79 0 0 0-4.27 1.37C2.06 8.74 1.27 13 1.66 17.19a19.95 19.95 0 0 0 6.04 3.05c.49-.66.92-1.36 1.29-2.1a12.84 12.84 0 0 1-2.03-.96c.17-.13.34-.26.5-.4a14.16 14.16 0 0 0 12.38 0c.16.14.33.27.5.4a12.84 12.84 0 0 1-2.03.96c.37.74.8 1.44 1.29 2.1a19.95 19.95 0 0 0 6.04-3.05c.46-4.85-.78-9.07-3.32-12.82zM8.81 14.55c-1.18 0-2.15-1.08-2.15-2.4s.95-2.4 2.15-2.4c1.2 0 2.17 1.08 2.15 2.4 0 1.32-.95 2.4-2.15 2.4zm6.38 0c-1.18 0-2.15-1.08-2.15-2.4s.95-2.4 2.15-2.4c1.2 0 2.17 1.08 2.15 2.4 0 1.32-.95 2.4-2.15 2.4z"/>
            </svg>
          </a>
          <NuxtLink
            to="/login"
            class="hidden sm:inline-flex items-center px-3 py-1.5 text-zinc-300 hover:text-white text-sm transition"
          >
            Sign in
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="inline-flex items-center px-3 py-1.5 bg-white text-zinc-950 rounded-md font-semibold text-sm hover:bg-zinc-100 transition ml-1"
          >
            Get started
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <!-- ===== Footer ===== -->
    <footer class="border-t border-zinc-900 mt-auto">
      <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-10">
          <!-- Brand -->
          <div class="col-span-2 space-y-4">
            <NuxtLink to="/" class="inline-flex">
              <img src="/logo.png" alt="FileMCP" class="h-8 w-auto mix-blend-screen" />
            </NuxtLink>
            <p class="text-zinc-400 text-sm leading-relaxed max-w-xs">
              The publishing layer for AI-generated work.
            </p>
          </div>

          <!-- Account -->
          <div class="space-y-3">
            <h3 class="text-zinc-300 text-xs uppercase tracking-[0.18em] font-medium">Account</h3>
            <ul class="space-y-2">
              <li v-for="l in accountLinks" :key="l.to">
                <NuxtLink :to="l.to" class="text-zinc-400 hover:text-zinc-200 text-sm transition">
                  {{ l.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Community -->
          <div class="space-y-3">
            <h3 class="text-zinc-300 text-xs uppercase tracking-[0.18em] font-medium">Community</h3>
            <ul class="space-y-2">
              <li v-for="l in communityLinks" :key="l.href">
                <a :href="l.href" target="_blank" rel="noopener" class="text-zinc-400 hover:text-zinc-200 text-sm transition">
                  {{ l.label }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Legal -->
          <div class="space-y-3">
            <h3 class="text-zinc-300 text-xs uppercase tracking-[0.18em] font-medium">Legal</h3>
            <ul class="space-y-2">
              <li v-for="l in legalLinks" :key="l.to">
                <NuxtLink :to="l.to" class="text-zinc-400 hover:text-zinc-200 text-sm transition">
                  {{ l.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-12 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-zinc-500 text-xs">
          <p>© {{ year }} NSpark, Inc.</p>
          <p class="font-mono shrink-0">FileMCP · MIT licensed</p>
        </div>
      </div>
    </footer>
  </div>
</template>
