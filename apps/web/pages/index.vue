<script setup lang="ts">
definePageMeta({ middleware: 'guest' })

useSeoMeta({
  title: 'cdnmcp — Host AI-generated assets instantly',
  description: 'Push an HTML deck or Markdown report from your terminal and get a shareable URL in seconds.',
})
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4">
    <div class="max-w-2xl w-full text-center space-y-8">
      <h1 class="text-5xl font-bold tracking-tight">
        From terminal to shareable link <br />
        <span class="text-zinc-400">in one command.</span>
      </h1>
      <p class="text-zinc-400 text-lg">
        Generate HTML, Markdown, or JSON with AI. Push it with curl. Share the URL.
        Collaborators can view and comment inline — no account required to view.
      </p>

      <div class="bg-zinc-900 rounded-xl p-4 text-left font-mono text-sm">
        <span class="text-zinc-500">$ </span>
        <span class="text-emerald-400">curl</span>
        <span class="text-zinc-300"> -X POST https://cdnmcp.com/api/assets \</span>
        <br />
        <span class="text-zinc-500">&nbsp;&nbsp;-H </span>
        <span class="text-amber-300">"Authorization: Bearer cdnmcp_..."</span>
        <span class="text-zinc-300"> \</span>
        <br />
        <span class="text-zinc-500">&nbsp;&nbsp;-F </span>
        <span class="text-amber-300">"file=@deck.html"</span>
        <br />
        <br />
        <span class="text-zinc-500"># </span>
        <span class="text-zinc-400">→ https://cdnmcp.com/u/you/deck</span>
      </div>

      <div class="text-left space-y-2">
        <p class="text-zinc-500 text-xs uppercase tracking-widest font-medium px-1">Or connect via MCP</p>
        <McpConfigTabs />
      </div>

      <div class="flex gap-4 justify-center">
        <NuxtLink
          to="/register"
          class="px-6 py-3 bg-white text-zinc-950 rounded-lg font-semibold hover:bg-zinc-100 transition"
        >
          Get started
        </NuxtLink>
        <NuxtLink
          to="/login"
          class="px-6 py-3 text-zinc-300 hover:text-white transition"
        >
          Sign in
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
