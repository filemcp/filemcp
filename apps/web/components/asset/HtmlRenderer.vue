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
const iframeRef = ref<HTMLIFrameElement>()
const blobSrc = ref('')

onMounted(async () => {
  const html = await fetch(props.contentUrl).then(r => r.text())
  const listener = `<script>window.addEventListener('message',function(e){if(e.data==='print')window.print()})<\/script>`
  const injected = html.includes('</body>')
    ? html.replace('</body>', listener + '</body>')
    : html + listener
  const blob = new Blob([injected], { type: 'text/html' })
  blobSrc.value = URL.createObjectURL(blob)
})

onUnmounted(() => {
  if (blobSrc.value) URL.revokeObjectURL(blobSrc.value)
})

function print() {
  iframeRef.value?.contentWindow?.postMessage('print', '*')
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
      :src="blobSrc || contentUrl"
      sandbox="allow-scripts allow-modals"
      class="w-full h-full border-0 bg-white"
      title="Asset content"
    />

    <!-- Comment pins overlay -->
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
