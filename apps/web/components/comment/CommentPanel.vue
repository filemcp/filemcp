<script setup lang="ts">
import type { Comment } from '@filemcp/types'

const props = defineProps<{
  comments: Comment[]
  assetId: string
  isOwner: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()
const commentStore = useCommentStore()
const hideResolved = ref(false)

const visible = computed(() =>
  hideResolved.value ? props.comments.filter(c => !c.resolved) : props.comments
)

async function toggleResolve(comment: Comment) {
  await $api(`/comments/${comment.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ resolved: !comment.resolved }),
    headers: { 'Content-Type': 'application/json' },
  })
  emit('refresh')
}

async function deleteComment(id: string) {
  await $api(`/comments/${id}`, { method: 'DELETE' })
  emit('refresh')
}

const resolvedCount = computed(() => props.comments.filter(c => c.resolved).length)
</script>

<template>
  <aside class="w-80 shrink-0 border-l border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden">
    <div class="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
      <span class="text-sm font-medium">Comments ({{ comments.length }})</span>
      <label v-if="resolvedCount > 0" class="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          v-model="hideResolved"
          type="checkbox"
          class="w-3 h-3 rounded accent-zinc-400 cursor-pointer"
        />
        <span class="text-xs text-zinc-500">Hide resolved</span>
      </label>
    </div>
    <div class="flex-1 overflow-y-auto">
      <div v-if="!comments.length" class="px-4 py-8 text-zinc-500 text-sm text-center">
        No comments yet. Click anywhere on the asset to add one.
      </div>
      <div v-else-if="!visible.length" class="px-4 py-8 text-zinc-500 text-sm text-center">
        All comments are resolved.
      </div>
      <CommentThread
        v-for="(comment, i) in visible"
        :key="comment.id"
        :comment="comment"
        :index="i + 1"
        :is-owner="isOwner"
        :active="commentStore.activeCommentId === comment.id"
        :asset-id="assetId"
        @click="commentStore.setActiveComment(comment.id)"
        @resolve="toggleResolve(comment)"
        @delete="deleteComment(comment.id)"
        @refresh="$emit('refresh')"
      />
    </div>
  </aside>
</template>
