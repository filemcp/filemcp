<script setup lang="ts">
const route = useRoute()
const org = route.params.org as string
const uuid = route.params.uuid as string
const version = route.params.version as string
const viewMode = route.query.mode === 'view'

const { data, error } = await useApi<any>(`/public/${org}/${uuid}/v/${version}`)

if (error.value) {
  throw createError({ statusCode: 404, message: 'Version not found' })
}

useSeoMeta({
  title: () => `${data.value?.title ?? uuid} v${version} — cdnmcp`,
})
</script>

<template>
  <AssetViewer v-if="data" :asset="data" :view-mode="viewMode" />
</template>
