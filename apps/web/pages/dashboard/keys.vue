<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { data: keys, refresh } = useApi<any[]>('/keys')
const newKeyName = ref('')
const newKey = ref<string | null>(null)
const creating = ref(false)

async function createKey() {
  if (!newKeyName.value.trim()) return
  creating.value = true
  try {
    const res = await $api<{ key: string; id: string; name: string }>('/keys', {
      method: 'POST',
      body: JSON.stringify({ name: newKeyName.value }),
      headers: { 'Content-Type': 'application/json' },
    })
    newKey.value = res.key
    newKeyName.value = ''
    refresh()
  } finally {
    creating.value = false
  }
}

async function revokeKey(id: string) {
  if (!confirm('Revoke this key?')) return
  await $api(`/keys/${id}`, { method: 'DELETE' })
  refresh()
}

function copyKey() {
  if (newKey.value) navigator.clipboard.writeText(newKey.value)
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white">
    <nav class="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
      <NuxtLink to="/dashboard" class="text-zinc-400 hover:text-white text-sm">← Dashboard</NuxtLink>
      <span class="font-semibold">API Keys</span>
    </nav>

    <main class="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <div v-if="newKey" class="border border-emerald-800 rounded-xl overflow-hidden space-y-0">
        <div class="bg-zinc-900 px-4 pt-4 pb-3 space-y-2">
          <p class="text-emerald-400 text-sm font-medium">Key created — copy it now, it won't be shown again.</p>
          <div class="flex gap-2">
            <code class="flex-1 bg-zinc-950 px-3 py-2 rounded text-xs font-mono text-zinc-300 overflow-x-auto">
              {{ newKey }}
            </code>
            <button
              class="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition"
              @click="copyKey"
            >
              Copy
            </button>
          </div>
        </div>
        <div class="border-t border-zinc-800">
          <p class="text-xs text-zinc-500 px-4 pt-3 pb-2 font-medium uppercase tracking-widest">Use with MCP</p>
          <McpConfigTabs :api-key="newKey" />
        </div>
        <div class="bg-zinc-900 px-4 py-3">
          <button class="text-xs text-zinc-500 hover:text-zinc-300" @click="newKey = null">Dismiss</button>
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="font-semibold">Create new key</h2>
        <div class="flex gap-2">
          <input
            v-model="newKeyName"
            placeholder="Key name (e.g. my-cli)"
            class="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg border border-zinc-800 focus:outline-none focus:border-zinc-600 text-sm"
            @keydown.enter="createKey"
          />
          <button
            :disabled="creating"
            class="px-4 py-2 bg-white text-zinc-950 rounded-lg text-sm font-semibold hover:bg-zinc-100 transition disabled:opacity-50"
            @click="createKey"
          >
            Create
          </button>
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="font-semibold">Active keys</h2>
        <div v-if="!keys?.length" class="text-zinc-500 text-sm">No keys yet.</div>
        <div
          v-for="key in keys"
          :key="key.id"
          class="flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3"
        >
          <div class="space-y-0.5">
            <p class="text-sm font-medium">{{ key.name }}</p>
            <p class="text-xs text-zinc-500 font-mono">cdnmcp_••••{{ key.lastFourChars }}</p>
          </div>
          <div class="flex items-center gap-4 text-xs text-zinc-500">
            <span v-if="key.lastUsedAt">Used {{ new Date(key.lastUsedAt).toLocaleDateString() }}</span>
            <span v-else>Never used</span>
            <button class="text-red-500 hover:text-red-400 transition" @click="revokeKey(key.id)">Revoke</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
