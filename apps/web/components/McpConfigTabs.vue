<script setup lang="ts">
const props = withDefaults(defineProps<{ apiKey?: string }>(), {
  apiKey: 'filemcp_...',
})

const config = useRuntimeConfig()
const mcpUrl = computed(() => {
  const base = import.meta.client
    ? window.location.origin
    : (config.public.appUrl ?? config.appUrl ?? '')
  return `${base}/api/mcp`
})

const tabs = ['claude', 'codex', 'json'] as const
type Tab = (typeof tabs)[number]
const activeTab = ref<Tab>('claude')
const copied = ref(false)

const jsonConfig = computed(() =>
  JSON.stringify(
    {
      mcpServers: {
        filemcp: {
          type: 'streamable-http',
          url: mcpUrl.value,
          headers: {
            Authorization: `Bearer ${props.apiKey}`,
          },
        },
      },
    },
    null,
    2,
  ),
)

const codexCommand = computed(
  () =>
    `codex --mcp-server '{"name":"filemcp","url":"${mcpUrl.value}","headers":{"Authorization":"Bearer ${props.apiKey}"}}'`,
)

const claudeCommand = computed(
  () =>
    `claude mcp add --transport http filemcp ${mcpUrl.value} -H "Authorization: Bearer ${props.apiKey}"`,
)

const activeContent = computed(() => {
  if (activeTab.value === 'json') return jsonConfig.value
  if (activeTab.value === 'codex') return codexCommand.value
  return claudeCommand.value
})

async function copy() {
  await navigator.clipboard.writeText(activeContent.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <div class="bg-zinc-900 rounded-xl overflow-hidden">
    <div class="flex items-center justify-between border-b border-zinc-800 px-3">
      <div class="flex">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="px-4 py-2.5 text-xs font-medium transition border-b-2 -mb-px"
          :class="
            activeTab === tab
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          "
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
      <button
        class="text-xs text-zinc-500 hover:text-zinc-300 transition py-2"
        @click="copy"
      >
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </div>
    <pre class="px-4 py-3 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed text-left">{{ activeContent }}</pre>
  </div>
</template>
