<script setup lang="ts">
import type { Comment } from '@filemcp/types'

const props = defineProps<{
  contentUrl: string
  commentMode: boolean
  comments: Comment[]
}>()

const emit = defineEmits<{
  click: [{ xPct: number; yPct: number; viewXPct: number; viewYPct: number; selectorHint: string }]
}>()

const containerRef = ref<HTMLDivElement>()
const iframeRef = ref<HTMLIFrameElement>()
const blobSrc = ref('')
const iframeScrollX = ref(0)
const iframeScrollY = ref(0)
const iframeDocWidth = ref(0)
const iframeDocHeight = ref(0)

const injectedScript = `<script>
(function(){
  function sendSize(){
    window.parent.postMessage({type:'size',w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight},'*')
  }
  window.addEventListener('scroll',function(){
    window.parent.postMessage({type:'scroll',x:window.scrollX,y:window.scrollY},'*')
  })
  window.addEventListener('message',function(e){
    if(e.data==='print') window.print()
    if(e.data&&e.data.type==='scrollBy') window.scrollBy(e.data.x,e.data.y)
  })
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',sendSize)
  else sendSize()
})()
<\/script>`

function onIframeMessage(e: MessageEvent) {
  if (e.source !== iframeRef.value?.contentWindow) return
  if (e.data?.type === 'scroll') {
    iframeScrollX.value = e.data.x
    iframeScrollY.value = e.data.y
  } else if (e.data?.type === 'size') {
    iframeDocWidth.value = e.data.w
    iframeDocHeight.value = e.data.h
  }
}

onMounted(async () => {
  window.addEventListener('message', onIframeMessage)
  const html = await fetch(props.contentUrl).then(r => r.text())
  const injected = html.includes('</body>')
    ? html.replace('</body>', injectedScript + '</body>')
    : html + injectedScript
  const blob = new Blob([injected], { type: 'text/html' })
  blobSrc.value = URL.createObjectURL(blob)
})

onUnmounted(() => {
  window.removeEventListener('message', onIframeMessage)
  if (blobSrc.value) URL.revokeObjectURL(blobSrc.value)
})

function print() {
  iframeRef.value?.contentWindow?.postMessage('print', '*')
}

defineExpose({ print })

function forwardWheel(e: WheelEvent) {
  iframeRef.value?.contentWindow?.postMessage({ type: 'scrollBy', x: e.deltaX, y: e.deltaY }, '*')
}

function handleOverlayClick(e: MouseEvent) {
  if (!props.commentMode || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const docWidth = iframeDocWidth.value || rect.width
  const docHeight = iframeDocHeight.value || rect.height
  const viewXPct = (e.clientX - rect.left) / rect.width
  const viewYPct = (e.clientY - rect.top) / rect.height
  const xPct = ((e.clientX - rect.left) + iframeScrollX.value) / docWidth
  const yPct = ((e.clientY - rect.top) + iframeScrollY.value) / docHeight
  emit('click', { xPct, yPct, viewXPct, viewYPct, selectorHint: '' })
}

function pinViewportPos(xPct: number, yPct: number) {
  const docWidth = iframeDocWidth.value || containerRef.value?.clientWidth || 1
  const docHeight = iframeDocHeight.value || containerRef.value?.clientHeight || 1
  const viewWidth = containerRef.value?.clientWidth || 1
  const viewHeight = containerRef.value?.clientHeight || 1
  return {
    xPct: (xPct * docWidth - iframeScrollX.value) / viewWidth,
    yPct: (yPct * docHeight - iframeScrollY.value) / viewHeight,
  }
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
      v-if="blobSrc"
      ref="iframeRef"
      :src="blobSrc"
      sandbox="allow-scripts allow-modals"
      class="w-full h-full border-0 bg-white"
      title="Asset content"
    />

    <!-- Comment pins overlay -->
    <div
      class="absolute inset-0"
      :class="commentMode ? 'pointer-events-auto' : 'pointer-events-none'"
      @wheel.prevent="forwardWheel"
    >
      <CommentPin
        v-for="(comment, i) in comments.filter(c => c.anchorType === 'POSITION' && c.xPct !== null)"
        :key="comment.id"
        :index="i + 1"
        :x-pct="pinViewportPos(comment.xPct!, comment.yPct!).xPct"
        :y-pct="pinViewportPos(comment.xPct!, comment.yPct!).yPct"
        :active="useCommentStore().activeCommentId === comment.id"
        @click.stop="useCommentStore().setActiveComment(comment.id)"
      />
    </div>
  </div>
</template>
