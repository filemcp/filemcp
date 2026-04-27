<script setup lang="ts">
import type { Comment } from '@filemcp/types'

const props = defineProps<{
  contentUrl: string
  commentMode: boolean
  comments: Comment[]
  currentVersionId: string
}>()

const versionPins = computed(() =>
  props.comments.filter(
    (c) => c.versionId === props.currentVersionId && c.anchorType === 'POSITION' && c.xPct !== null,
  ),
)

const emit = defineEmits<{
  click: [{ xPct: number; yPct: number; viewXPct: number; viewYPct: number; selectorHint: string }]
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
  const scrollLeft = containerRef.value.scrollLeft
  const scrollTop = containerRef.value.scrollTop
  const docWidth = containerRef.value.scrollWidth
  const docHeight = containerRef.value.scrollHeight
  const viewXPct = (e.clientX - rect.left) / containerRef.value.clientWidth
  const viewYPct = (e.clientY - rect.top) / containerRef.value.clientHeight
  const xPct = ((e.clientX - rect.left) + scrollLeft) / docWidth
  const yPct = ((e.clientY - rect.top) + scrollTop) / docHeight
  const selectorHint = buildSelectorHint(e.target as Element)
  emit('click', { xPct, yPct, viewXPct, viewYPct, selectorHint })
}
</script>

<template>
  <div
    ref="containerRef"
    class="w-full h-full overflow-y-auto bg-white dark:bg-zinc-900"
    @click="handleClick"
  >
    <div class="relative" :class="commentMode ? 'cursor-crosshair' : ''">
      <article
        class="prose prose-zinc dark:prose-invert max-w-3xl mx-auto py-12 px-6"
        v-html="html"
      />
      <CommentPin
        v-for="(comment, i) in versionPins"
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
