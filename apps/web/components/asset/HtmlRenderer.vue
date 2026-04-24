<script setup lang="ts">
import type { Comment } from '@cdnmcp/types'

const props = defineProps<{
  contentUrl: string
  commentMode: boolean
  comments: Comment[]
}>()

const emit = defineEmits<{
  click: [{ xPct: number; yPct: number; selectorHint: string }]
}>()

const containerRef = ref<HTMLDivElement>()
const iframeRef = ref<HTMLIFrameElement>()

function print() {
  iframeRef.value?.contentWindow?.print()
}

defineExpose({ print })

function handleOverlayClick(e: MouseEvent) {
  if (!props.commentMode || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const xPct = (e.clientX - rect.left) / rect.width
  const yPct = (e.clientY - rect.top) / rect.height
  emit('click', { xPct, yPct, selectorHint: '' })
}
</script>

<template>
  <div
    ref="containerRef"
    class="relative w-full h-full"
    :class="commentMode ? 'cursor-crosshair' : ''"
    @click="handleOverlayClick"
  >
    <iframe
      ref="iframeRef"
      :src="contentUrl"
      sandbox="allow-scripts"
      class="w-full h-full border-0 bg-white"
      title="Asset content"
    />

    <!-- Comment pins overlay (pointer-events-none so iframe receives events normally, unless in comment mode) -->
    <div
      class="absolute inset-0"
      :class="commentMode ? 'pointer-events-auto' : 'pointer-events-none'"
    >
      <CommentPin
        v-for="(comment, i) in comments.filter(c => c.anchorType === 'POSITION' && c.xPct !== null)"
        :key="comment.id"
        :index="i + 1"
        :x-pct="comment.xPct!"
        :y-pct="comment.yPct!"
        :active="useCommentStore().activeCommentId === comment.id"
        @click.stop="useCommentStore().setActiveComment(comment.id)"
      />
    </div>
  </div>
</template>
