<script setup lang="ts">
const props = defineProps<{
  username: string
  uuid: string
}>()

const emit = defineEmits<{ close: [] }>()

type Mode = 'comments' | 'view'
const mode = ref<Mode>('comments')
const copied = ref(false)

const url = computed(() => {
  const base = `${window.location.origin}/u/${props.username}/${props.uuid}`
  return mode.value === 'view' ? `${base}?mode=view` : base
})

async function copy() {
  await navigator.clipboard.writeText(url.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
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
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 p-6 space-y-5">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold">Share link</h2>
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
      </div>
    </div>
  </Teleport>
</template>
