<script setup lang="ts">
const props = defineProps<{
  anchor: { xPct: number; yPct: number; viewXPct: number; viewYPct: number; selectorHint: string }
  assetId: string
}>()

const emit = defineEmits<{
  submitted: []
  cancel: []
}>()

const auth = useAuthStore()
const body = ref('')
const anonName = ref('')
const anonEmail = ref('')
const submitting = ref(false)
const nudge = ref<{ message: string; signupUrl: string } | null>(null)
const errors = ref({ body: false, anonName: false })
const textareaRef = ref<HTMLTextAreaElement>()

onMounted(() => nextTick(() => textareaRef.value?.focus()))

const left = computed(() => `${Math.min(props.anchor.viewXPct * 100, 75)}%`)
const top = computed(() => `${Math.min(props.anchor.viewYPct * 100, 80)}%`)

async function submit() {
  errors.value.body = !body.value.trim()
  errors.value.anonName = !auth.isAuthenticated && !anonName.value.trim()
  if (errors.value.body || errors.value.anonName) return
  submitting.value = true
  try {
    const payload: any = {
      body: body.value,
      anchorType: 'POSITION',
      xPct: props.anchor.xPct,
      yPct: props.anchor.yPct,
      selectorHint: props.anchor.selectorHint,
    }
    if (!auth.isAuthenticated) {
      payload.anonName = anonName.value
      if (anonEmail.value) payload.anonEmail = anonEmail.value
    }

    const res = await $api<any>(`/assets/${props.assetId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })

    if (res.nudge && !localStorage.getItem('filemcp_nudge_dismissed')) {
      nudge.value = res.nudge
    } else {
      emit('submitted')
    }
  } finally {
    submitting.value = false
  }
}

function dismissNudge() {
  localStorage.setItem('filemcp_nudge_dismissed', '1')
  nudge.value = null
  emit('submitted')
}
</script>

<template>
  <div
    class="absolute z-50 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-4 space-y-3"
    :style="{ left, top }"
    @click.stop
  >
    <!-- Nudge state -->
    <template v-if="nudge">
      <p class="text-sm text-zinc-300 font-medium">Comment posted!</p>
      <p class="text-xs text-zinc-400">{{ nudge.message }}</p>
      <div class="flex gap-2">
        <NuxtLink
          :to="nudge.signupUrl"
          class="flex-1 text-center py-2 bg-white text-zinc-950 rounded-lg text-xs font-semibold hover:bg-zinc-100 transition"
        >
          Create free account
        </NuxtLink>
        <button
          class="text-xs text-zinc-500 hover:text-zinc-300 transition"
          @click="dismissNudge"
        >
          Maybe later
        </button>
      </div>
    </template>

    <!-- Compose state -->
    <template v-else>
      <textarea
        ref="textareaRef"
        v-model="body"
        rows="3"
        placeholder="Leave a comment…"
        class="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1"
        :class="errors.body ? 'ring-1 ring-red-500 focus:ring-red-500' : 'focus:ring-zinc-600'"
        @input="errors.body = false"
      />

      <template v-if="!auth.isAuthenticated">
        <input
          v-model="anonName"
          placeholder="Your name (required)"
          class="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1"
          :class="errors.anonName ? 'ring-1 ring-red-500 focus:ring-red-500' : 'focus:ring-zinc-600'"
          @input="errors.anonName = false"
        />
        <input
          v-model="anonEmail"
          type="email"
          placeholder="Email (optional — get notified on replies)"
          class="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />
      </template>

      <div class="flex gap-2">
        <button
          :disabled="submitting"
          class="flex-1 py-2 bg-white text-zinc-950 rounded-lg text-sm font-semibold hover:bg-zinc-100 transition disabled:opacity-50"
          @click="submit"
        >
          {{ submitting ? 'Posting…' : 'Post comment' }}
        </button>
        <button
          class="px-3 text-zinc-500 hover:text-zinc-300 transition"
          @click="$emit('cancel')"
        >
          ✕
        </button>
      </div>
    </template>
  </div>
</template>
