<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error.statusCode === 404)

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4">
    <div class="max-w-md w-full text-center space-y-6">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-300/80 text-[11px] font-medium tracking-[0.18em] uppercase">
        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
        Error {{ error.statusCode }}
      </div>
      <h1 class="text-3xl font-semibold tracking-tight text-white">
        {{ is404 ? 'Asset not found' : 'Something went wrong' }}
      </h1>
      <p class="text-zinc-400">
        {{ is404
          ? 'This asset doesn\'t exist or may have been removed.'
          : error.message || 'An unexpected error occurred.'
        }}
      </p>
      <button
        class="px-5 py-2.5 bg-white text-zinc-950 rounded-lg font-semibold hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(34,211,238,0.45)] transition text-sm"
        @click="handleError"
      >
        Go home
      </button>
    </div>
  </div>
</template>
