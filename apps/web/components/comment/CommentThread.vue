<script setup lang="ts">
import type { Comment } from '@filemcp/types'

const props = defineProps<{
  comment: Comment
  index: number
  isOwner: boolean
  active: boolean
  assetId: string
  onOtherVersion?: boolean
}>()


const replyBody = ref('')
const replying = ref(false)
const auth = useAuthStore()
const emit = defineEmits<{ click: []; resolve: []; delete: []; refresh: [] }>()

async function submitReply(commentId: string) {
  if (!replyBody.value.trim()) return
  await $api(`/assets/${props.assetId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body: replyBody.value, parentId: commentId }),
    headers: { 'Content-Type': 'application/json' },
  })
  replyBody.value = ''
  replying.value = false
  emit('refresh')
}
</script>

<template>
  <div
    :class="[
      'px-4 py-3 border-b border-zinc-800 cursor-pointer transition',
      active ? 'bg-zinc-900' : 'hover:bg-zinc-900/50',
      comment.resolved ? 'opacity-50' : '',
    ]"
    @click="$emit('click')"
  >
    <div class="flex items-start gap-2">
      <span
        :class="[
          'shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center mt-0.5',
          active ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-700 text-zinc-300',
        ]"
      >{{ index }}</span>
      <div class="flex-1 min-w-0 space-y-1">
        <div class="flex items-center gap-1.5 text-xs text-zinc-400">
          <span class="font-medium text-zinc-300">
            {{ comment.author?.username ?? comment.anonName ?? 'Guest' }}
          </span>
          <span v-if="!comment.author" class="text-zinc-600">(guest)</span>
          <span class="text-zinc-600">·</span>
          <span>{{ new Date(comment.createdAt).toLocaleDateString() }}</span>
          <span
            v-if="comment.versionNumber != null"
            :class="[
              'px-1.5 py-0.5 rounded text-[10px] font-mono leading-none',
              onOtherVersion
                ? 'bg-zinc-800 text-zinc-500'
                : 'bg-zinc-700 text-zinc-300',
            ]"
            :title="onOtherVersion ? `Made on v${comment.versionNumber} — switch versions to see the pin in context` : `Made on v${comment.versionNumber}`"
          >v{{ comment.versionNumber }}</span>
          <span v-if="comment.resolved" class="ml-auto text-emerald-500">Resolved</span>
        </div>
        <p class="text-sm text-zinc-200 leading-relaxed">{{ comment.body }}</p>

        <!-- Replies -->
        <div v-if="comment.replies.length" class="mt-2 space-y-2 pl-3 border-l border-zinc-700">
          <div v-for="reply in comment.replies" :key="reply.id" class="text-xs space-y-0.5">
            <span class="font-medium text-zinc-400">
              {{ reply.author?.username ?? reply.anonName ?? 'Guest' }}
            </span>
            <p class="text-zinc-300">{{ reply.body }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-1 text-xs text-zinc-500">
          <button
            v-if="auth.isAuthenticated"
            class="hover:text-zinc-300 transition"
            @click.stop="replying = !replying"
          >
            Reply
          </button>
          <button
            v-if="isOwner || comment.author?.username === auth.user?.username"
            class="hover:text-zinc-300 transition"
            @click.stop="$emit('resolve')"
          >
            {{ comment.resolved ? 'Unresolve' : 'Resolve' }}
          </button>
          <button
            v-if="isOwner || comment.author?.username === auth.user?.username"
            class="hover:text-red-400 transition ml-auto"
            @click.stop="$emit('delete')"
          >
            Delete
          </button>
        </div>

        <!-- Reply box -->
        <div v-if="replying" class="mt-2 space-y-1" @click.stop>
          <textarea
            v-model="replyBody"
            rows="2"
            placeholder="Write a reply…"
            class="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 resize-none focus:outline-none"
          />
          <div class="flex gap-2">
            <button
              class="text-xs px-2 py-1 bg-white text-zinc-950 rounded hover:bg-zinc-100 transition"
              @click="submitReply(comment.id)"
            >
              Post
            </button>
            <button class="text-xs text-zinc-500 hover:text-zinc-300" @click="replying = false">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
