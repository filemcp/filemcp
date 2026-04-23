<script setup lang="ts">
import type { Comment } from '@cdnmcp/types'

defineProps<{
  comments: Comment[]
  assetId: string
  isOwner: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()
const commentStore = useCommentStore()

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
</script>

<template>
  <aside class="w-80 shrink-0 border-l border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden">
    <div class="px-4 py-3 border-b border-zinc-800 text-sm font-medium">
      Comments ({{ comments.length }})
    </div>
    <div class="flex-1 overflow-y-auto">
      <div v-if="!comments.length" class="px-4 py-8 text-zinc-500 text-sm text-center">
        No comments yet. Click anywhere on the asset to add one.
      </div>
      <CommentThread
        v-for="(comment, i) in comments"
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
