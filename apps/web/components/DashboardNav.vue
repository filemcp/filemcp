<script setup lang="ts">
const auth = useAuthStore()
const router = useRouter()

// Refresh orgs list so invited users see newly added orgs
onMounted(async () => {
  if (auth.token) {
    try {
      const me = await $api<{ orgs: Array<{ slug: string; name: string; role: string }> }>('/users/me')
      auth.setOrgs(me.orgs as any)
    } catch {}
  }
})

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-6">
      <NuxtLink to="/" class="font-bold text-lg">cdnmcp</NuxtLink>
      <div class="flex gap-4 text-sm">
        <NuxtLink to="/dashboard" class="text-zinc-400 hover:text-white" active-class="text-white">Assets</NuxtLink>
        <NuxtLink to="/dashboard/members" class="text-zinc-400 hover:text-white" active-class="text-white">Members</NuxtLink>
        <NuxtLink to="/dashboard/keys" class="text-zinc-400 hover:text-white" active-class="text-white">API Keys</NuxtLink>
      </div>
    </div>

    <div class="flex items-center gap-4 text-sm">
      <!-- Org switcher (only shown when user belongs to multiple orgs) -->
      <select
        v-if="auth.orgs.length > 1"
        :value="auth.activeOrg?.slug"
        class="px-2 py-1 bg-zinc-900 text-white rounded border border-zinc-700 text-xs focus:outline-none focus:border-zinc-500"
        @change="auth.switchOrg(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="org in auth.orgs" :key="org.slug" :value="org.slug">
          {{ org.name }} ({{ org.role.toLowerCase() }})
        </option>
      </select>
      <span v-else class="text-zinc-500 text-xs font-mono">{{ auth.activeOrg?.slug }}</span>

      <span class="text-zinc-600 text-xs">{{ auth.user?.username }}</span>
      <button class="text-zinc-400 hover:text-white transition" @click="logout">Log out</button>
    </div>
  </nav>
</template>
