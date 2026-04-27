<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'dashboard' })

const auth = useAuthStore()
const orgSlug = computed(() => auth.activeOrg?.slug ?? null)

const { data, pending, refresh } = useApi<{ items: any[]; total: number }>(
  computed(() => orgSlug.value ? `/orgs/${orgSlug.value}/assets` : null),
)

watch(() => auth.activeOrg?.slug, () => refresh())

const visibilityOpen = ref<string | null>(null)
const shareAsset = ref<{ id: string; org: string; uuid: string; title: string } | null>(null)

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC',  label: 'Public',  desc: 'Anyone can view' },
  { value: 'PRIVATE', label: 'Private', desc: 'Only you and invited users' },
]

const VISIBILITY_STYLE: Record<string, string> = {
  PUBLIC:  'text-emerald-400',
  PRIVATE: 'text-violet-400',
}

async function setVisibility(assetId: string, visibility: string) {
  visibilityOpen.value = null
  await $api(`/orgs/${orgSlug.value}/assets/${assetId}`, {
    method: 'PATCH',
    body: JSON.stringify({ visibility }),
    headers: { 'Content-Type': 'application/json' },
  })
  refresh()
}


async function deleteAsset(id: string) {
  if (!confirm('Delete this asset and all its versions?')) return
  await $api(`/orgs/${orgSlug.value}/assets/${id}`, { method: 'DELETE' })
  refresh()
}

// Close visibility dropdown on outside click
if (import.meta.client) {
  document.addEventListener('click', () => { visibilityOpen.value = null })
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-8">
    <div v-if="data?.items?.length" class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-semibold">My Assets</h1>
        <span class="text-zinc-400 text-sm">{{ data.total }} total</span>
      </div>

      <div v-if="pending" class="text-zinc-400">Loading…</div>

      <DashboardConnectView v-else-if="!data?.items?.length" class="py-8" />

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="asset in data.items"
          :key="asset.id"
          class="group relative p-[1px] rounded-xl bg-gradient-to-br from-cyan-500/50 via-zinc-700 to-violet-500/50 hover:from-cyan-500/70 hover:to-violet-500/70 transition"
        >
        <div class="rounded-[11px] overflow-hidden bg-zinc-950/95 backdrop-blur-sm">
          <NuxtLink :to="`/u/${asset.owner.org}/${asset.uuid}`" target="_blank" class="block">
            <div class="aspect-video bg-zinc-900 flex items-center justify-center">
              <img
                v-if="asset.thumbnailUrl"
                :src="asset.thumbnailUrl"
                :alt="asset.title"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-zinc-600 text-4xl font-mono">{{ asset.title?.[0] ?? '?' }}</span>
            </div>
          </NuxtLink>

          <div class="p-4 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <NuxtLink
                :to="`/u/${asset.owner.org}/${asset.uuid}`"
                target="_blank"
                class="font-medium text-sm truncate hover:text-zinc-300"
              >
                {{ asset.title ?? asset.slug }}
              </NuxtLink>
              <span class="text-xs text-zinc-500 shrink-0">v{{ asset.latestVersion }}</span>
            </div>

            <div class="flex items-center gap-3 text-xs text-zinc-400">
              <span class="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                {{ asset.viewCount }}
              </span>
              <span>{{ asset.commentCount }} comments</span>

              <!-- Visibility picker -->
              <div class="relative ml-auto" @click.stop>
                <button
                  :class="['flex items-center gap-1 transition hover:opacity-80', VISIBILITY_STYLE[asset.visibility]]"
                  @click="visibilityOpen = visibilityOpen === asset.id ? null : asset.id"
                >
                  {{ asset.visibility.charAt(0) + asset.visibility.slice(1).toLowerCase() }}
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
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
                    v-if="visibilityOpen === asset.id"
                    class="absolute right-0 bottom-full mb-1.5 w-44 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl shadow-black/40 z-50 overflow-hidden"
                  >
                    <button
                      v-for="opt in VISIBILITY_OPTIONS"
                      :key="opt.value"
                      class="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-700 transition-colors text-left"
                      @click="setVisibility(asset.id, opt.value)"
                    >
                      <div>
                        <p :class="['text-xs font-medium', VISIBILITY_STYLE[opt.value]]">{{ opt.label }}</p>
                        <p class="text-xs text-zinc-400">{{ opt.desc }}</p>
                      </div>
                      <svg v-if="asset.visibility === opt.value" class="w-3.5 h-3.5 text-white shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </Transition>
              </div>
            </div>

            <div class="flex gap-2 items-center">
              <button
                class="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white transition"
                @click="shareAsset = { id: asset.id, org: asset.owner.org, uuid: asset.uuid, title: asset.title ?? asset.slug }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                Share link
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
      </div>

    <ShareModal
      v-if="shareAsset"
      :org="shareAsset.org"
      :uuid="shareAsset.uuid"
      :asset-id="shareAsset.id"
      :org-slug="shareAsset.org"
      :asset-title="shareAsset.title"
      @close="shareAsset = null"
    />
  </div>
</template>
