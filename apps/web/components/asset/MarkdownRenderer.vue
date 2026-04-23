<script setup lang="ts">
import type { Comment } from '@cdnmcp/types'

const props = defineProps<{
  contentUrl: string
  comments: Comment[]
}>()

const { data: html } = await useFetch<string>(() => props.contentUrl)
</script>

<template>
  <div class="w-full h-full overflow-y-auto bg-white dark:bg-zinc-900">
    <article
      class="prose prose-zinc dark:prose-invert max-w-3xl mx-auto py-12 px-6"
      v-html="html"
    />
  </div>
</template>
