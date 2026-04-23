<script setup lang="ts">
const auth = useAuthStore()
const router = useRouter()
const open = ref(false)
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

function selectOrg(slug: string) {
  auth.switchOrg(slug)
  open.value = false
}

function logout() {
  auth.logout()
  router.push('/login')
}

const ROLE_COLOR: Record<string, string> = {
  OWNER: 'text-amber-400',
  WRITE: 'text-sky-400',
  READ: 'text-zinc-400',
}
</script>

<template>
  <nav class="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-6">
      <NuxtLink to="/" class="font-bold text-lg">cdnmcp</NuxtLink>
      <div class="flex gap-4 text-sm">
        <NuxtLink to="/dashboard" class="text-zinc-400 hover:text-white transition-colors" active-class="!text-white">Assets</NuxtLink>
        <NuxtLink to="/dashboard/members" class="text-zinc-400 hover:text-white transition-colors" active-class="!text-white">Members</NuxtLink>
        <NuxtLink to="/dashboard/keys" class="text-zinc-400 hover:text-white transition-colors" active-class="!text-white">API Keys</NuxtLink>
      </div>
    </div>

    <div class="flex items-center gap-3 text-sm">
      <!-- Org switcher -->
      <div ref="dropdownRef" class="relative">
        <button
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-900 hover:bg-zinc-800 transition-all text-sm"
          @click="open = !open"
        >
          <span class="w-5 h-5 rounded-md bg-zinc-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
            {{ auth.activeOrg?.slug?.[0] ?? '?' }}
          </span>
          <span class="font-medium text-white max-w-32 truncate">{{ auth.activeOrg?.name ?? '…' }}</span>
          <span v-if="auth.activeOrg" :class="['text-xs', ROLE_COLOR[auth.activeOrg.role]]">
            {{ auth.activeOrg.role.toLowerCase() }}
          </span>
          <svg
            v-if="auth.orgs.length > 1"
            class="w-3 h-3 text-zinc-500 transition-transform"
            :class="{ 'rotate-180': open }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Dropdown -->
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

      <button class="text-zinc-500 hover:text-white transition-colors text-xs" @click="logout">
        Log out
      </button>
    </div>
  </nav>
</template>
