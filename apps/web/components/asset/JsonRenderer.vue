<script setup lang="ts">
defineProps<{ contentUrl: string }>()

const { data: raw } = await useFetch<string>((props: any) => props.contentUrl)
const parsed = computed(() => {
  try { return JSON.parse(raw.value ?? '') } catch { return null }
})
</script>

<template>
  <div class="w-full h-full overflow-y-auto bg-zinc-950 p-6">
    <pre class="text-sm text-zinc-300 font-mono whitespace-pre-wrap">{{ parsed ? JSON.stringify(parsed, null, 2) : raw }}</pre>
  </div>
</template>
