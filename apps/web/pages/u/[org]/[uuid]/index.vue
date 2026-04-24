<script setup lang="ts">
const route = useRoute()
const org = route.params.org as string
const uuid = route.params.uuid as string
const viewMode = route.query.mode === 'view'

const { data, error } = await useApi<any>(`/public/${org}/${uuid}`)

if (error.value) {
  throw createError({ statusCode: 404, message: 'Asset not found' })
}

useSeoMeta({
  title: () => `${data.value?.title ?? uuid} — filemcp`,
  ogTitle: () => data.value?.title ?? uuid,
  description: () => `Shared by ${org} on filemcp`,
  ogImage: () => data.value?.currentVersion?.thumbnailUrl ?? undefined,
})
</script>

<template>
  <AssetViewer v-if="data" :asset="data" :view-mode="viewMode" />
</template>
