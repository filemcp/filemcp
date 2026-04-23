<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const orgSlug = computed(() => auth.activeOrg?.slug ?? null)

const { data, pending, refresh } = useApi<{ items: any[]; total: number }>(
  computed(() => orgSlug.value ? `/orgs/${orgSlug.value}/assets` : null),
)

// Refresh when the active org changes
watch(() => auth.activeOrg?.slug, () => refresh())

async function copyUrl(username: string, slug: string) {
  const url = `${window.location.origin}/u/${username}/${slug}`
  await navigator.clipboard.writeText(url)
}

async function deleteAsset(id: string) {
  if (!confirm('Delete this asset and all its versions?')) return
  await $api(`/orgs/${orgSlug.value}/assets/${id}`, { method: 'DELETE' })
  refresh()
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white">
    <DashboardNav />

    <main class="max-w-5xl mx-auto px-6 py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-semibold">My Assets</h1>
        <span class="text-zinc-500 text-sm">{{ data?.total ?? 0 }} total</span>
      </div>

      <div v-if="pending" class="text-zinc-500">Loading…</div>

      <div v-else-if="!data?.items?.length" class="text-center py-24 space-y-3">
        <p class="text-zinc-300 font-medium">No assets yet</p>
        <p class="text-zinc-500 text-sm">Create an API key, then upload your first file via curl or the MCP server.</p>
        <NuxtLink
          to="/dashboard/keys"
          class="inline-block mt-2 px-4 py-2 bg-white text-zinc-950 rounded-lg text-sm font-semibold hover:bg-zinc-100 transition"
        >
          Create an API key
        </NuxtLink>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="asset in data.items"
          :key="asset.id"
          class="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition group"
        >
          <NuxtLink :to="`/u/${asset.owner.username}/${asset.slug}`" class="block">
            <div class="aspect-video bg-zinc-800 flex items-center justify-center">
              <img
                v-if="asset.thumbnailUrl"
                :src="asset.thumbnailUrl"
                :alt="asset.title"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-zinc-600 text-4xl font-mono">{{ asset.slug[0] }}</span>
            </div>
          </NuxtLink>
          <div class="p-4 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <NuxtLink
                :to="`/u/${asset.owner.username}/${asset.slug}`"
                class="font-medium text-sm truncate hover:text-zinc-300"
              >
                {{ asset.title ?? asset.slug }}
              </NuxtLink>
              <span class="text-xs text-zinc-600 shrink-0">v{{ asset.latestVersion }}</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-zinc-500">
              <span>{{ asset.commentCount }} comments</span>
              <span>{{ asset.visibility.toLowerCase() }}</span>
            </div>
            <div class="flex gap-2">
              <button
                class="text-xs text-zinc-400 hover:text-white transition"
                @click="copyUrl(asset.owner.username, asset.slug)"
              >
                Copy URL
              </button>
              <button
                class="text-xs text-red-500 hover:text-red-400 transition ml-auto"
                @click="deleteAsset(asset.id)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
