<script setup lang="ts">
const props = defineProps<{
  org: string
  uuid: string
  // Asset id is required for the email-send action (calls POST /orgs/:slug/assets/:id/share).
  // Passing null disables the "Send to" section (used by anonymous/public viewers).
  assetId?: string | null
  orgSlug?: string | null
  assetTitle?: string | null
}>()

const emit = defineEmits<{ close: [] }>()

type Mode = 'comments' | 'view'
const mode = ref<Mode>('comments')
const copied = ref(false)
const auth = useAuthStore()

const url = computed(() => {
  const base = `${window.location.origin}/u/${props.org}/${props.uuid}`
  return mode.value === 'view' ? `${base}?mode=view` : base
})

const shareTitle = computed(() => {
  if (props.assetTitle) return `${props.assetTitle} — FileMCP`
  return 'Shared with you on FileMCP'
})

async function copy() {
  await navigator.clipboard.writeText(url.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// --- Quick share (social) ---
const supportsWebShare = ref(false)
onMounted(() => {
  supportsWebShare.value = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
})

function shareTo(platform: 'x' | 'linkedin' | 'whatsapp') {
  const text = encodeURIComponent(shareTitle.value)
  const link = encodeURIComponent(url.value)
  let target = ''
  if (platform === 'x') target = `https://twitter.com/intent/tweet?url=${link}&text=${text}`
  else if (platform === 'linkedin') target = `https://www.linkedin.com/sharing/share-offsite/?url=${link}`
  else if (platform === 'whatsapp') target = `https://wa.me/?text=${text}%20${link}`
  window.open(target, '_blank', 'noopener,noreferrer,width=600,height=600')
}

async function nativeShare() {
  try {
    await navigator.share({ url: url.value, title: shareTitle.value })
  } catch {
    // user dismissed — no-op
  }
}

// --- Send via email ---
const canSendEmail = computed(() => auth.isAuthenticated && !!props.assetId && !!props.orgSlug)
const sendEmail = ref('')
const sendNote = ref('')
const sending = ref(false)
const sent = ref(false)
const sendError = ref('')

async function send() {
  if (!props.assetId || !props.orgSlug || !sendEmail.value.trim()) return
  sendError.value = ''
  sending.value = true
  try {
    await $api(`/orgs/${props.orgSlug}/assets/${props.assetId}/share`, {
      method: 'POST',
      body: JSON.stringify({
        email: sendEmail.value.trim(),
        mode: mode.value,
        note: sendNote.value.trim() || undefined,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    sent.value = true
    setTimeout(() => {
      sent.value = false
      sendEmail.value = ''
      sendNote.value = ''
    }, 2400)
  } catch (e: any) {
    sendError.value = e?.data?.message ?? 'Could not send'
  } finally {
    sending.value = false
  }
}

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}

onMounted(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }
  document.addEventListener('keydown', onKey)
  onUnmounted(() => document.removeEventListener('keydown', onKey))
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      @click="onBackdrop"
    >
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 p-6 space-y-5 text-zinc-100">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold">Share</h2>
          <button class="text-zinc-500 hover:text-white transition" @click="emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Mode toggle -->
        <div class="grid grid-cols-2 gap-2">
          <button
            class="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition"
            :class="mode === 'comments'
              ? 'border-white bg-white/5 text-white'
              : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'"
            @click="mode = 'comments'"
          >
            <span class="text-xs font-medium">With comments</span>
            <span class="text-[11px] text-zinc-500">Full experience</span>
          </button>
          <button
            class="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition"
            :class="mode === 'view'
              ? 'border-white bg-white/5 text-white'
              : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'"
            @click="mode = 'view'"
          >
            <span class="text-xs font-medium">View only</span>
            <span class="text-[11px] text-zinc-500">Comments hidden</span>
          </button>
        </div>

        <!-- URL preview + copy -->
        <div class="space-y-2">
          <div class="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5">
            <span class="flex-1 text-xs font-mono text-zinc-400 truncate">{{ url }}</span>
            <button
              class="shrink-0 text-xs font-medium transition px-2.5 py-1 rounded-lg"
              :class="copied
                ? 'bg-emerald-900/50 text-emerald-400'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'"
              @click="copy"
            >
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>

          <!-- Quick share row (social) -->
          <div class="flex items-center gap-1.5 pt-1">
            <span class="text-[11px] text-zinc-500 mr-1">Or share to:</span>
            <button
              class="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Share on X"
              @click="shareTo('x')"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </button>
            <button
              class="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Share on LinkedIn"
              @click="shareTo('linkedin')"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </button>
            <button
              class="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Share on WhatsApp"
              @click="shareTo('whatsapp')"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
            </button>
            <button
              v-if="supportsWebShare"
              class="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="More…"
              @click="nativeShare"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Send to email -->
        <div v-if="canSendEmail" class="space-y-2 pt-2 border-t border-zinc-800">
          <p class="text-xs text-zinc-500 pt-3">Send a copy to:</p>
          <div class="flex gap-2">
            <input
              v-model="sendEmail"
              type="email"
              placeholder="email@example.com"
              :disabled="sending || sent"
              class="flex-1 px-3 py-2 bg-zinc-950 text-white text-sm rounded-lg border border-zinc-800 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.14)] disabled:opacity-50"
            />
            <button
              :disabled="sending || sent || !sendEmail.trim()"
              class="shrink-0 px-3 py-2 text-sm font-semibold rounded-lg transition disabled:opacity-50"
              :class="sent
                ? 'bg-emerald-900/50 text-emerald-400'
                : 'bg-white text-zinc-950 hover:bg-zinc-100 hover:shadow-[0_0_24px_rgba(34,211,238,0.4)]'"
              @click="send"
            >
              {{ sent ? 'Sent!' : sending ? 'Sending…' : 'Send' }}
            </button>
          </div>
          <textarea
            v-model="sendNote"
            placeholder="Add a note (optional)…"
            rows="2"
            maxlength="500"
            :disabled="sending || sent"
            class="w-full px-3 py-2 bg-zinc-950 text-white text-sm rounded-lg border border-zinc-800 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.14)] resize-none disabled:opacity-50"
          />
          <p v-if="sendError" class="text-red-400 text-xs">{{ sendError }}</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
