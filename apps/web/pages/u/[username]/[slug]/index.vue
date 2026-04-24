<script setup lang="ts">
const route = useRoute()
const username = route.params.username as string
const slug = route.params.slug as string
const viewMode = route.query.mode === 'view'

const { data, error } = await useApi<any>(`/public/${username}/${slug}`)

if (error.value) {
  throw createError({ statusCode: 404, message: 'Asset not found' })
}

useSeoMeta({
  title: () => `${data.value?.title ?? slug} — cdnmcp`,
  ogTitle: () => data.value?.title ?? slug,
  description: () => `Shared by ${username} on cdnmcp`,
  ogImage: () => data.value?.currentVersion?.thumbnailUrl ?? undefined,
})
</script>

<template>
  <AssetViewer v-if="data" :asset="data" :view-mode="viewMode" />
</template>
