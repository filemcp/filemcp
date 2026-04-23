<script setup lang="ts">
defineProps<{ contentUrl: string; fileType: string }>()

const { data: content } = await useFetch<string>((props: any) => props.contentUrl)
</script>

<template>
  <div class="w-full h-full overflow-y-auto bg-zinc-950 p-6">
    <pre class="text-sm text-zinc-300 font-mono whitespace-pre-wrap">{{ content }}</pre>
  </div>
</template>
