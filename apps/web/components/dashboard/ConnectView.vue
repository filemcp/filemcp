<script setup lang="ts">
const auth = useAuthStore()
const orgSlug = computed(() => auth.activeOrg?.slug ?? null)

// freshKey is the plain key value, only populated for the onboarding session
// when we just generated it. Never stored anywhere — page reload = it's gone.
const freshKey = ref<string | null>(null)
const existingKeyCount = ref(0)
const loading = ref(true)
const copiedKey = ref(false)
const copiedCurl = ref(false)

async function bootstrap() {
  if (!orgSlug.value) return
  loading.value = true
  try {
    const keys = await $api<Array<{ id: string; name: string }>>(`/orgs/${orgSlug.value}/keys`)
    existingKeyCount.value = keys?.length ?? 0

    // First-time onboarding: no keys exist → auto-generate "default" and show it once.
    if (existingKeyCount.value === 0) {
      const res = await $api<{ id: string; name: string; key: string }>(
        `/orgs/${orgSlug.value}/keys`,
        {
          method: 'POST',
          body: JSON.stringify({ name: 'default' }),
          headers: { 'Content-Type': 'application/json' },
        },
      )
      freshKey.value = res.key
      existingKeyCount.value = 1
    }
  } finally {
    loading.value = false
  }
}

function copyKey() {
  if (!freshKey.value) return
  navigator.clipboard.writeText(freshKey.value)
  copiedKey.value = true
  setTimeout(() => (copiedKey.value = false), 1500)
}

const config = useRuntimeConfig()
const apiBase = computed(() => {
  const base = import.meta.client
    ? window.location.origin
    : (config.public.appUrl ?? '')
  return `${base}/api`
})

const curlCommand = computed(() => {
  const key = freshKey.value ?? 'filemcp_...'
  const slug = orgSlug.value ?? '<org>'
  return `echo '<!doctype html><html><body style="font-family:system-ui;padding:48px;text-align:center"><h1>Hello from FileMCP</h1><p>This is your first published artifact.</p></body></html>' > hello.html && \\
curl -X POST "${apiBase.value}/orgs/${slug}/assets" \\
  -H "Authorization: Bearer ${key}" \\
  -H "X-Upload-Source: cli" \\
  -F "file=@hello.html;type=text/html"`
})

function copyCurl() {
  navigator.clipboard.writeText(curlCommand.value)
  copiedCurl.value = true
  setTimeout(() => (copiedCurl.value = false), 1500)
}

onMounted(() => {
  bootstrap()
})

watch(() => auth.activeOrg?.slug, () => {
  freshKey.value = null
  bootstrap()
})
</script>

<template>
  <div class="relative">
    <!-- Subtle ambient glow -->
    <div class="pointer-events-none absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.06] blur-[120px]" />
    <div class="pointer-events-none absolute -top-10 right-0 w-[400px] h-[400px] rounded-full bg-violet-500/[0.06] blur-[120px]" />

    <div class="relative max-w-3xl mx-auto space-y-10">
      <!-- Header -->
      <div class="space-y-3 text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-300/80 text-[11px] font-medium tracking-[0.18em] uppercase">
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          Get started
        </div>
        <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          Connect FileMCP to your AI
        </h1>
        <p class="text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Three short steps. Once connected, your AI agent can publish files directly to your account.
        </p>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center text-zinc-500 text-sm py-8">Setting up your workspace…</div>

      <template v-else>
        <!-- Step 1: API Key -->
        <section class="relative p-[1px] rounded-xl bg-gradient-to-br from-cyan-500/50 via-zinc-700 to-cyan-500/30">
          <div class="rounded-[11px] bg-zinc-950/95 backdrop-blur-sm p-6 space-y-4">
            <div class="flex items-start gap-3">
              <div class="text-xs font-mono text-cyan-400/80 tracking-widest mt-1">01</div>
              <div class="flex-1 space-y-1">
                <h2 class="text-lg font-semibold text-white">Your API key</h2>
                <p class="text-sm text-zinc-400">Authenticates uploads from your AI tools.</p>
              </div>
            </div>

            <div v-if="freshKey" class="space-y-2">
              <div class="flex gap-2">
                <code class="flex-1 bg-zinc-900 px-3 py-2.5 rounded-lg text-xs font-mono text-zinc-200 overflow-x-auto border border-zinc-800">{{ freshKey }}</code>
                <button
                  class="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition shrink-0"
                  @click="copyKey"
                >
                  {{ copiedKey ? 'Copied!' : 'Copy' }}
                </button>
              </div>
              <p class="text-[11px] text-amber-300/80">
                Copy it now — for security, the secret value won't be shown again. You can manage and rotate keys in
                <NuxtLink to="/dashboard/keys" class="text-zinc-200 hover:text-cyan-300 underline-offset-2 hover:underline transition">API Keys</NuxtLink>.
              </p>
            </div>

            <div v-else class="text-sm text-zinc-400 leading-relaxed">
              You already have {{ existingKeyCount }}
              {{ existingKeyCount === 1 ? 'API key' : 'API keys' }}. Use the value you saved when you created it, or
              <NuxtLink to="/dashboard/keys" class="text-zinc-200 hover:text-cyan-300 underline-offset-2 hover:underline transition">create a new one</NuxtLink>.
            </div>
          </div>
        </section>

        <!-- Step 2: MCP Config -->
        <section class="relative p-[1px] rounded-xl bg-gradient-to-br from-cyan-500/50 via-zinc-700 to-violet-500/50">
          <div class="rounded-[11px] bg-zinc-950/95 backdrop-blur-sm p-6 space-y-4">
            <div class="flex items-start gap-3">
              <div class="text-xs font-mono text-cyan-400/80 tracking-widest mt-1">02</div>
              <div class="flex-1 space-y-1">
                <h2 class="text-lg font-semibold text-white">Install in your AI tool</h2>
                <p class="text-sm text-zinc-400">Pick your client. Run the command — your key is already filled in.</p>
              </div>
            </div>
            <McpConfigTabs :api-key="freshKey ?? 'filemcp_...'" />
          </div>
        </section>

        <!-- Step 3: Try it -->
        <section class="relative p-[1px] rounded-xl bg-gradient-to-br from-violet-500/50 via-zinc-700 to-violet-500/30">
          <div class="rounded-[11px] bg-zinc-950/95 backdrop-blur-sm p-6 space-y-4">
            <div class="flex items-start gap-3">
              <div class="text-xs font-mono text-violet-300/80 tracking-widest mt-1">03</div>
              <div class="flex-1 space-y-1">
                <h2 class="text-lg font-semibold text-white">Publish your first file</h2>
                <p class="text-sm text-zinc-400">
                  Ask your AI agent to publish a file — or run this curl command yourself to test.
                </p>
              </div>
            </div>

            <div class="bg-zinc-900 rounded-xl overflow-hidden">
              <div class="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                <span class="text-xs text-zinc-500 font-mono">curl</span>
                <button class="text-xs text-zinc-500 hover:text-zinc-300 transition" @click="copyCurl">
                  {{ copiedCurl ? 'Copied!' : 'Copy' }}
                </button>
              </div>
              <pre class="px-4 py-3 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed text-left">{{ curlCommand }}</pre>
            </div>

            <p class="text-xs text-zinc-500 leading-relaxed">
              When your first asset goes live, it'll appear in
              <NuxtLink to="/dashboard" class="text-zinc-300 hover:text-cyan-300 underline-offset-2 hover:underline transition">My Assets</NuxtLink>.
            </p>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
