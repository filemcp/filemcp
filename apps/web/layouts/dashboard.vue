<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white flex flex-col overflow-x-clip">
    <DashboardNav />

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-zinc-900 mt-12">
      <div class="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-zinc-500 text-xs">
        <p>© {{ year }} NSpark, Inc.</p>
        <div class="flex items-center gap-4">
          <NuxtLink to="/terms" class="hover:text-zinc-300 transition">Terms</NuxtLink>
          <NuxtLink to="/privacy" class="hover:text-zinc-300 transition">Privacy</NuxtLink>
          <a href="https://discord.gg/hRVhz5WTpe" target="_blank" rel="noopener" class="hover:text-zinc-300 transition">Discord</a>
          <a href="https://github.com/filemcp/filemcp" target="_blank" rel="noopener" class="hover:text-zinc-300 transition">GitHub</a>
        </div>
      </div>
    </footer>
  </div>
</template>
