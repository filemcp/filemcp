<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'dashboard' })

useSeoMeta({
  title: 'Connect — FileMCP',
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-12">
    <DashboardConnectView />
  </div>
</template>
