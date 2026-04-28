<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()

useSeoMeta({
  ogUrl: () => `${config.public.appUrl}${route.path}`,
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
