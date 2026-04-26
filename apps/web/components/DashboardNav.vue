<script setup lang="ts">
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const open = ref(false)
const mobileOpen = ref(false)
const dropdownRef = ref<HTMLElement>()

onMounted(async () => {
  if (auth.token) {
    try {
      const me = await $api<{ orgs: Array<{ slug: string; name: string; role: string }> }>('/users/me')
      auth.setOrgs(me.orgs as any)
    } catch {}
  }

  document.addEventListener('click', (e) => {
    if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
      open.value = false
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', () => {})
})

// Close mobile menu when navigating
watch(() => route.fullPath, () => { mobileOpen.value = false })

function selectOrg(slug: string) {
  auth.switchOrg(slug)
  open.value = false
}

function logout() {
  mobileOpen.value = false
  auth.logout()
  router.push('/login')
}

const ROLE_COLOR: Record<string, string> = {
  OWNER: 'text-cyan-400',
  WRITE: 'text-violet-400',
  READ: 'text-zinc-400',
}

const TABS = [
  { label: 'Assets',   to: '/dashboard' },
  { label: 'Connect',  to: '/dashboard/connect' },
  { label: 'Members',  to: '/dashboard/members' },
  { label: 'API Keys', to: '/dashboard/keys' },
]
</script>

<template>
  <nav class="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
      <!-- Left: logo + desktop tabs -->
      <div class="flex items-center gap-6 min-w-0">
        <NuxtLink to="/" class="select-none shrink-0">
          <img src="/logo.jpg" alt="FileMCP" class="h-6 w-auto" />
        </NuxtLink>
        <div class="hidden md:flex gap-1 text-sm">
          <NuxtLink
            v-for="t in TABS"
            :key="t.to"
            :to="t.to"
            class="px-2.5 py-1.5 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors"
            active-class="!text-cyan-300 [text-shadow:0_0_12px_rgba(34,211,238,0.5)]"
          >{{ t.label }}</NuxtLink>
        </div>
      </div>

      <!-- Right: desktop actions / mobile org + hamburger -->
      <div class="flex items-center gap-1 sm:gap-2 text-sm shrink-0">
        <!-- GitHub (desktop) -->
        <a
          href="https://github.com/filemcp/filemcp"
          target="_blank"
          rel="noopener"
          class="hidden md:inline-flex p-2 text-zinc-400 hover:text-white transition rounded-md hover:bg-zinc-900"
          aria-label="GitHub"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.18-.02-2.14-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.79-.01 3.16 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
          </svg>
        </a>
        <!-- Discord (desktop) -->
        <a
          href="https://discord.gg/filemcp"
          target="_blank"
          rel="noopener"
          class="hidden md:inline-flex p-2 text-zinc-400 hover:text-white transition rounded-md hover:bg-zinc-900 mr-1"
          aria-label="Discord"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.32 4.37A19.79 19.79 0 0 0 16.05 3a13.6 13.6 0 0 0-.65 1.32 18.27 18.27 0 0 0-5.5 0A13.6 13.6 0 0 0 9.25 3a19.79 19.79 0 0 0-4.27 1.37C2.06 8.74 1.27 13 1.66 17.19a19.95 19.95 0 0 0 6.04 3.05c.49-.66.92-1.36 1.29-2.1a12.84 12.84 0 0 1-2.03-.96c.17-.13.34-.26.5-.4a14.16 14.16 0 0 0 12.38 0c.16.14.33.27.5.4a12.84 12.84 0 0 1-2.03.96c.37.74.8 1.44 1.29 2.1a19.95 19.95 0 0 0 6.04-3.05c.46-4.85-.78-9.07-3.32-12.82zM8.81 14.55c-1.18 0-2.15-1.08-2.15-2.4s.95-2.4 2.15-2.4c1.2 0 2.17 1.08 2.15 2.4 0 1.32-.95 2.4-2.15 2.4zm6.38 0c-1.18 0-2.15-1.08-2.15-2.4s.95-2.4 2.15-2.4c1.2 0 2.17 1.08 2.15 2.4 0 1.32-.95 2.4-2.15 2.4z"/>
          </svg>
        </a>

        <!-- Org switcher (always visible, simplified on mobile) -->
        <div ref="dropdownRef" class="relative">
          <button
            class="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-900 hover:bg-zinc-800 transition-all text-sm"
            @click="open = !open"
          >
            <span class="w-5 h-5 rounded-md bg-zinc-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
              {{ auth.activeOrg?.slug?.[0] ?? '?' }}
            </span>
            <span class="hidden sm:inline font-medium text-white max-w-32 truncate">{{ auth.activeOrg?.name ?? '…' }}</span>
            <span v-if="auth.activeOrg" :class="['hidden sm:inline text-xs', ROLE_COLOR[auth.activeOrg.role]]">
              {{ auth.activeOrg.role.toLowerCase() }}
            </span>
            <svg
              v-if="auth.orgs.length > 1"
              class="hidden sm:block w-3 h-3 text-zinc-500 transition-transform"
              :class="{ 'rotate-180': open }"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="open && auth.orgs.length > 1"
              class="absolute right-0 mt-1.5 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/40 z-50 overflow-hidden"
            >
              <div class="px-3 py-2 border-b border-zinc-800">
                <p class="text-xs text-zinc-500 uppercase tracking-widest font-medium">Switch org</p>
              </div>
              <div class="py-1">
                <button
                  v-for="org in auth.orgs"
                  :key="org.slug"
                  class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 transition-colors text-left"
                  @click="selectOrg(org.slug)"
                >
                  <span class="w-7 h-7 rounded-md bg-zinc-700 flex items-center justify-center text-xs font-bold uppercase shrink-0"
                    :class="{ 'ring-2 ring-white/20': org.slug === auth.activeOrg?.slug }">
                    {{ org.slug[0] }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">{{ org.name }}</p>
                    <p class="text-xs text-zinc-500 truncate">{{ org.slug }}</p>
                  </div>
                  <svg v-if="org.slug === auth.activeOrg?.slug" class="w-3.5 h-3.5 text-white shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Logout (desktop) -->
        <button class="hidden md:inline-block text-zinc-400 hover:text-white transition-colors text-xs" @click="logout">
          Log out
        </button>

        <!-- Mobile hamburger -->
        <button
          class="md:hidden p-2 text-zinc-400 hover:text-white transition rounded-md hover:bg-zinc-900"
          :aria-expanded="mobileOpen"
          aria-label="Menu"
          @click="mobileOpen = !mobileOpen"
        >
          <svg v-if="!mobileOpen" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile menu panel -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="mobileOpen" class="md:hidden absolute top-full inset-x-0 z-40 border-t border-zinc-900 bg-zinc-950/95 backdrop-blur-md shadow-xl shadow-black/40">
        <div class="max-w-7xl mx-auto px-4 py-3 space-y-1">
          <NuxtLink
            v-for="t in TABS"
            :key="t.to"
            :to="t.to"
            class="block px-3 py-2.5 rounded-md text-zinc-300 hover:bg-zinc-900 transition-colors"
            active-class="!text-cyan-300 bg-zinc-900"
          >{{ t.label }}</NuxtLink>
          <div class="border-t border-zinc-900 my-2" />
          <a
            href="https://github.com/filemcp/filemcp"
            target="_blank"
            rel="noopener"
            class="block px-3 py-2.5 rounded-md text-zinc-300 hover:bg-zinc-900 transition-colors"
          >GitHub</a>
          <a
            href="https://discord.gg/filemcp"
            target="_blank"
            rel="noopener"
            class="block px-3 py-2.5 rounded-md text-zinc-300 hover:bg-zinc-900 transition-colors"
          >Discord</a>
          <div class="border-t border-zinc-900 my-2" />
          <button
            class="w-full text-left px-3 py-2.5 rounded-md text-zinc-300 hover:bg-zinc-900 transition-colors"
            @click="logout"
          >
            Log out
          </button>
        </div>
      </div>
    </Transition>
  </nav>
</template>
