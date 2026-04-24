<script setup lang="ts">
definePageMeta({ middleware: 'guest' })

useSeoMeta({
  title: 'filemcp — Host AI-generated assets instantly',
  description: 'Push an HTML deck or Markdown report from your terminal and get a shareable URL in seconds.',
})
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4 py-20">
    <!-- Subtle radial glow behind the headline -->
    <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div class="w-[600px] h-[400px] rounded-full bg-white/[0.03] blur-3xl" />
    </div>

    <div class="relative max-w-3xl w-full text-center space-y-10">
      <!-- Wordmark -->
      <div class="text-3xl font-black tracking-tight select-none">
        <span class="text-white">cdn</span><span class="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">mcp</span>
      </div>

      <!-- Badge -->
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 text-zinc-500 text-xs font-medium tracking-wide">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        AI-native publishing
      </div>

      <!-- Headline -->
      <div class="space-y-3">
        <h1 class="text-5xl font-bold tracking-tight leading-[1.1] whitespace-nowrap">
          <span class="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            PowerPoints and PDFs are dead.
          </span>
        </h1>
        <p class="text-xl text-zinc-500 font-medium tracking-tight">
          From terminal to shareable link.
        </p>
      </div>

      <!-- Description -->
      <p class="text-zinc-400 text-base leading-relaxed max-w-lg mx-auto">
        Generate HTML, Markdown, or JSON with AI. Push it. Share the URL.
        Collaborators can view and comment inline — no account required to view.
      </p>

      <!-- CTAs -->
      <div class="flex gap-3 justify-center">
        <NuxtLink
          to="/register"
          class="px-6 py-2.5 bg-white text-zinc-950 rounded-lg font-semibold hover:bg-zinc-100 transition text-sm"
        >
          Get started free
        </NuxtLink>
        <NuxtLink
          to="/login"
          class="px-6 py-2.5 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-lg transition text-sm"
        >
          Sign in
        </NuxtLink>
      </div>

      <!-- Divider -->
      <div class="flex items-center gap-4 pt-2">
        <div class="flex-1 h-px bg-zinc-800" />
        <span class="text-zinc-600 text-xs uppercase tracking-widest font-medium">Connect via MCP</span>
        <div class="flex-1 h-px bg-zinc-800" />
      </div>

      <!-- MCP config -->
      <McpConfigTabs />
    </div>
  </div>
</template>
