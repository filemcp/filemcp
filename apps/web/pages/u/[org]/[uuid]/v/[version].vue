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

const config = useRuntimeConfig()
const fallbackOg = `${config.public.appUrl}/og.jpg`

useSeoMeta({
  title: () => `${data.value?.title ?? uuid} v${version} — FileMCP`,
  description: () => `Shared by ${org} on FileMCP — view and comment in the browser.`,
  ogTitle: () => `${data.value?.title ?? uuid} (v${version})`,
  ogDescription: () => `Shared by ${org} on FileMCP — view and comment in the browser.`,
  ogImage: () => data.value?.currentVersion?.thumbnailUrl ?? fallbackOg,
  twitterTitle: () => `${data.value?.title ?? uuid} (v${version})`,
  twitterDescription: () => `Shared by ${org} on FileMCP`,
  twitterImage: () => data.value?.currentVersion?.thumbnailUrl ?? fallbackOg,
})
</script>

<template>
  <AssetViewer v-if="data" :asset="data" :view-mode="viewMode" />
</template>
