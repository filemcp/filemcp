<script setup lang="ts">
defineProps<{
  index: number
  xPct: number
  yPct: number
  active: boolean
}>()

defineEmits<{ click: [] }>()
</script>

<template>
  <button
    :style="{ left: `${xPct * 100}%`, top: `${yPct * 100}%` }"
    :class="[
      'absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition shadow-lg',
      active
        ? 'bg-amber-400 text-zinc-950 scale-125'
        : 'bg-zinc-900 text-white border border-zinc-600 hover:bg-zinc-700',
    ]"
    @click="$emit('click')"
  >
    {{ index }}
  </button>
</template>
