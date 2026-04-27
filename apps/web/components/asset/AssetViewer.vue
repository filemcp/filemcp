<script setup lang="ts">
import type { Comment } from '@filemcp/types'

const props = defineProps<{
  viewMode?: boolean
  asset: {
    assetId: string
    uuid: string
    slug: string
    title: string
    owner: { org: string }
    latestVersion: number
    currentVersion: {
      id: string
      number: number
      fileType: string
      contentUrl: string
      thumbnailUrl: string | null
    }
    commentCount: number
    viewCount: number
    visibility: string
    isOwner: boolean
    isMember: boolean
  }
}>()

const route = useRoute()
const commentStore = useCommentStore()
const panelOpen = ref(!props.viewMode)
commentStore.commentMode = !props.viewMode

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

function handleViewerClick(event: { xPct: number; yPct: number; viewXPct: number; viewYPct: number; selectorHint: string }) {
  if (!commentStore.commentMode) return
  commentStore.setPendingAnchor(event)
}

onMounted(() => commentStore.setPendingAnchor(null))
onUnmounted(() => commentStore.setPendingAnchor(null))

const htmlRendererRef = ref<{ print: () => void } | null>(null)

function printAsset() {
  if (props.asset.currentVersion.fileType === 'HTML') {
    htmlRendererRef.value?.print()
  } else {
    window.print()
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
    <!-- Top bar -->
    <header class="flex items-center gap-4 px-4 py-3 border-b border-zinc-800 shrink-0">
      <NuxtLink to="/" class="shrink-0">
        <img src="/logo.png" alt="FileMCP" class="h-6 w-auto" />
      </NuxtLink>
      <span class="text-zinc-600">/</span>
      <span class="text-zinc-400 text-sm">{{ asset.owner.org }}</span>
      <span class="text-zinc-600">/</span>
      <span class="text-sm font-medium">{{ asset.title }}</span>

      <div class="ml-auto flex items-center gap-3">
        <!-- View count -->
        <span class="flex items-center gap-1 text-xs text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          {{ asset.viewCount }}
        </span>

        <!-- Version selector -->
        <select
          v-if="asset.isOwner || asset.isMember"
          class="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
          :value="asset.currentVersion.number"
          @change="(e) => navigateTo(`/u/${asset.owner.org}/${asset.uuid}/v/${(e.target as HTMLSelectElement).value}`)"
        >
          <option v-for="v in asset.latestVersion" :key="v" :value="v">v{{ v }}</option>
        </select>

        <!-- Print button -->
        <button
          class="p-2 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
          title="Print"
          @click="printAsset"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
        </button>

        <!-- Comments toggle (hidden in view mode) -->
        <button
          v-if="!viewMode"
          :class="[
            'relative p-2 rounded transition',
            panelOpen
              ? 'bg-cyan-400 text-zinc-950 shadow-[0_0_16px_rgba(34,211,238,0.5)]'
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
              panelOpen ? 'bg-zinc-950 text-cyan-400' : 'bg-cyan-400 text-zinc-950',
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
          ref="htmlRendererRef"
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
          v-if="!viewMode && commentStore.pendingAnchor"
          :anchor="commentStore.pendingAnchor"
          :asset-id="asset.assetId"
          :version-id="asset.currentVersion.id"
          @submitted="() => { commentStore.setPendingAnchor(null); refreshComments() }"
          @cancel="commentStore.setPendingAnchor(null)"
        />
      </div>

      <!-- Comment panel -->
      <CommentPanel
        v-if="!viewMode && panelOpen"
        :comments="commentStore.comments"
        :asset-id="asset.assetId"
        :is-owner="asset.isOwner"
        @refresh="refreshComments"
      />
    </div>
  </div>
</template>
