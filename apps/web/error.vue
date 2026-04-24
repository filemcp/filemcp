<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error.statusCode === 404)

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4">
    <div class="max-w-md w-full text-center space-y-6">
      <p class="text-zinc-600 text-sm font-mono">{{ error.statusCode }}</p>
      <h1 class="text-3xl font-bold tracking-tight">
        {{ is404 ? 'Asset not found' : 'Something went wrong' }}
      </h1>
      <p class="text-zinc-400">
        {{ is404
          ? 'This asset doesn\'t exist or may have been removed.'
          : error.message || 'An unexpected error occurred.'
        }}
      </p>
      <button
        class="px-5 py-2.5 bg-white text-zinc-950 rounded-lg font-semibold hover:bg-zinc-100 transition text-sm"
        @click="handleError"
      >
        Go home
      </button>
    </div>
  </div>
</template>
