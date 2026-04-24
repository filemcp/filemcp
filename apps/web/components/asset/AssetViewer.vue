<script setup lang="ts">
import type { Comment } from '@cdnmcp/types'

const props = defineProps<{
  asset: {
    assetId: string
    slug: string
    title: string
    owner: { username: string }
    latestVersion: number
    currentVersion: {
      number: number
      fileType: string
      contentUrl: string
      thumbnailUrl: string | null
    }
    commentCount: number
    visibility: string
    isOwner: boolean
  }
}>()

const route = useRoute()
const commentStore = useCommentStore()
const panelOpen = ref(true)
commentStore.commentMode = true

function toggleComments() {
  if (panelOpen.value && commentStore.commentMode) {
    panelOpen.value = false
    commentStore.commentMode = false
  } else {
    panelOpen.value = true
    commentStore.commentMode = true
  }
}

const { data: commentsData, refresh: refreshComments } = await useApi<Comment[]>(
  `/assets/${props.asset.assetId}/comments`,
)
commentStore.setComments(commentsData.value ?? [])
watch(commentsData, (val) => commentStore.setComments(val ?? []))

function handleViewerClick(event: { xPct: number; yPct: number; selectorHint: string }) {
  if (!commentStore.commentMode) return
  commentStore.setPendingAnchor(event)
}
</script>

<template>
  <div class="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
    <!-- Top bar -->
    <header class="flex items-center gap-4 px-4 py-3 border-b border-zinc-800 shrink-0">
      <NuxtLink to="/" class="font-bold text-sm">cdnmcp</NuxtLink>
      <span class="text-zinc-600">/</span>
      <span class="text-zinc-400 text-sm">{{ asset.owner.username }}</span>
      <span class="text-zinc-600">/</span>
      <span class="text-sm font-medium">{{ asset.title }}</span>

      <div class="ml-auto flex items-center gap-3">
        <!-- Version selector -->
        <select
          class="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
          :value="asset.currentVersion.number"
          @change="(e) => navigateTo(`/u/${asset.owner.username}/${asset.slug}/v/${(e.target as HTMLSelectElement).value}`)"
        >
          <option v-for="v in asset.latestVersion" :key="v" :value="v">v{{ v }}</option>
        </select>

        <!-- Comments toggle -->
        <button
          :class="[
            'relative p-2 rounded transition',
            panelOpen
              ? 'bg-amber-500 text-zinc-950'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
          ]"
          title="Comments"
          @click="toggleComments"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span
            v-if="commentStore.comments.length"
            :class="[
              'absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none',
              panelOpen ? 'bg-zinc-950 text-amber-400' : 'bg-amber-500 text-zinc-950',
            ]"
          >{{ commentStore.comments.length }}</span>
        </button>
      </div>
    </header>

    <!-- Main area -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Renderer -->
      <div class="flex-1 relative overflow-hidden">
        <AssetHtmlRenderer
          v-if="asset.currentVersion.fileType === 'HTML'"
          :content-url="asset.currentVersion.contentUrl"
          :comment-mode="commentStore.commentMode"
          :comments="commentStore.comments"
          @click="handleViewerClick"
        />
        <AssetMarkdownRenderer
          v-else-if="asset.currentVersion.fileType === 'MARKDOWN'"
          :content-url="asset.currentVersion.contentUrl"
          :comment-mode="commentStore.commentMode"
          :comments="commentStore.comments"
          @click="handleViewerClick"
        />
        <AssetJsonRenderer
          v-else-if="asset.currentVersion.fileType === 'JSON'"
          :content-url="asset.currentVersion.contentUrl"
        />
        <AssetCodeRenderer
          v-else
          :content-url="asset.currentVersion.contentUrl"
          :file-type="asset.currentVersion.fileType"
        />

        <!-- Comment compose popup -->
        <CommentCompose
          v-if="commentStore.pendingAnchor"
          :anchor="commentStore.pendingAnchor"
          :asset-id="asset.assetId"
          @submitted="() => { commentStore.setPendingAnchor(null); refreshComments() }"
          @cancel="commentStore.setPendingAnchor(null)"
        />
      </div>

      <!-- Comment panel -->
      <CommentPanel
        v-if="panelOpen"
        :comments="commentStore.comments"
        :asset-id="asset.assetId"
        :is-owner="asset.isOwner"
        @refresh="refreshComments"
      />
    </div>
  </div>
</template>
