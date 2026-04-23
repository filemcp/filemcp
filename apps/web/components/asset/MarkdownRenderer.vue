<script setup lang="ts">
import type { Comment } from '@cdnmcp/types'

defineProps<{
  contentUrl: string
  comments: Comment[]
}>()

const { data: html } = await useFetch<string>((props: any) => props.contentUrl)
</script>

<template>
  <div class="w-full h-full overflow-y-auto bg-white">
    <article
      class="prose prose-zinc max-w-3xl mx-auto py-12 px-6"
      v-html="html"
    />
  </div>
</template>
