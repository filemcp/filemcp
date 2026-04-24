<script setup lang="ts">
import type { Comment } from '@filemcp/types'

const props = defineProps<{
  contentUrl: string
  commentMode: boolean
  comments: Comment[]
}>()

const emit = defineEmits<{
  click: [{ xPct: number; yPct: number; selectorHint: string }]
}>()

const containerRef = ref<HTMLDivElement>()
const { data: html } = await useFetch<string>(() => props.contentUrl)

function buildSelectorHint(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  while (current && current !== containerRef.value) {
    parts.unshift(current.tagName.toLowerCase())
    current = current.parentElement
  }
  return parts.join('>')
}

function handleClick(e: MouseEvent) {
  if (!props.commentMode || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const xPct = (e.clientX - rect.left) / rect.width
  const yPct = (e.clientY - rect.top) / rect.height
  const selectorHint = buildSelectorHint(e.target as Element)
  emit('click', { xPct, yPct, selectorHint })
}
</script>

<template>
  <div
    ref="containerRef"
    class="relative w-full h-full overflow-y-auto bg-white dark:bg-zinc-900"
    :class="commentMode ? 'cursor-crosshair' : ''"
    @click="handleClick"
  >
    <article
      class="prose prose-zinc dark:prose-invert max-w-3xl mx-auto py-12 px-6"
      v-html="html"
    />

    <!-- Comment pins overlay -->
    <div class="absolute inset-0 pointer-events-none">
      <CommentPin
        v-for="(comment, i) in comments.filter(c => c.anchorType === 'POSITION' && c.xPct !== null)"
        :key="comment.id"
        :index="i + 1"
        :x-pct="comment.xPct!"
        :y-pct="comment.yPct!"
        :active="useCommentStore().activeCommentId === comment.id"
        style="pointer-events: auto"
        @click.stop="useCommentStore().setActiveComment(comment.id)"
      />
    </div>
  </div>
</template>
