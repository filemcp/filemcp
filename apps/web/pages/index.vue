<script setup lang="ts">
definePageMeta({ layout: 'marketing', middleware: 'guest' })

const config = useRuntimeConfig()
const ogImageUrl = `${config.public.appUrl}/og.jpg`
const description =
  'Publish AI-generated HTML and Markdown as a shareable link. Inline comments and version history built in. Your agent ships, your team comments, your agent revises.'

useSeoMeta({
  title: 'FileMCP — AI-native publishing for generated work',
  description,
  ogTitle: 'FileMCP — Turn AI-generated work into shareable links',
  ogDescription: description,
  ogImage: ogImageUrl,
  ogImageType: 'image/jpeg',
  ogImageWidth: 1600,
  ogImageHeight: 840,
  ogImageAlt: 'FileMCP — Turn AI-generated work into shareable links',
  twitterTitle: 'FileMCP — Turn AI-generated work into shareable links',
  twitterDescription: description,
  twitterImage: ogImageUrl,
  twitterImageAlt: 'FileMCP — Turn AI-generated work into shareable links',
})

const hasDemoVideo = true
const demoVideoSrc = '/filemcp.mp4'
const demoPosterSrc = '/icon.png'

const steps = [
  {
    n: '01',
    title: 'Generate',
    body: 'Your agent creates the artifact in the conversation — a deck, a report, a prototype.',
  },
  {
    n: '02',
    title: 'Publish',
    body: 'Ask your agent to publish, get back a shareable URL you can send to your peers.',
  },
  {
    n: '03',
    title: 'Revise',
    body: 'Reviewers comment in the browser. Your agent reads the feedback and ships v2 — at the same URL.',
  },
]
</script>

<template>
  <div>
    <!-- ===== Hero ===== -->
    <!-- clip-path lets blobs extend up into the transparent nav, but clips them at section sides + bottom -->
    <section
      class="relative px-4 pt-16 pb-20 sm:pt-20 sm:pb-28"
      style="clip-path: inset(-200px 0 0 0); -webkit-clip-path: inset(-200px 0 0 0);"
    >
      <!-- Glow blobs — anchored to a content-width wrapper so they sit behind the hero
           on ultrawide instead of drifting to the screen edges. -->
      <div class="pointer-events-none absolute inset-0 flex justify-center">
        <div class="relative w-full max-w-7xl">
          <!-- Cyan glow blob — bleeds up into the transparent nav but its hot center sits below it -->
          <div class="absolute -top-16 -left-32 w-[480px] h-[480px] lg:w-[900px] lg:h-[900px] rounded-full bg-cyan-500/[0.22] lg:bg-cyan-500/[0.22] blur-[140px]" />
          <!-- Violet glow blob -->
          <div class="absolute top-4 -right-40 w-[440px] h-[440px] lg:w-[800px] lg:h-[800px] rounded-full bg-violet-500/[0.22] lg:bg-violet-500/[0.22] blur-[140px]" />
          <!-- Center bridge — fills the dark gap between cyan/violet on wide displays -->
          <div class="absolute inset-x-0 top-0 flex justify-center">
            <div class="w-[600px] h-[400px] lg:w-[1000px] lg:h-[500px] xl:w-[1400px] xl:h-[600px] rounded-full bg-violet-500/[0.10] lg:bg-violet-500/[0.10] xl:bg-violet-500/[0.14] blur-[140px] -mt-16" />
          </div>
        </div>
      </div>
      <!-- Bottom fade — covers the blobs with page bg color so they fade smoothly into the next section -->
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-zinc-950 to-transparent" />
      <!-- Dotted grid background -->
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.4]"
        style="background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 24px 24px; mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);"
      />

      <div class="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <!-- Left column: text -->
        <div class="space-y-7 text-center lg:text-left">
          <!-- Eyebrow -->
          <div class="flex justify-center lg:justify-start">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-300/80 text-[9px] sm:text-[11px] font-medium tracking-[0.18em] uppercase backdrop-blur-sm">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              The publishing layer for AI-generated work
            </div>
          </div>

          <!-- Headline -->
          <div class="space-y-5">
            <h1 class="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08] text-white">
              Turn AI-generated work into shareable links.
            </h1>
            <p class="text-lg text-zinc-300 font-medium tracking-tight leading-snug max-w-xl mx-auto lg:mx-0">
              FileMCP gives AI agents a place to publish HTML and Markdown — with browser rendering, inline comments, and versioning.
            </p>
          </div>

          <!-- CTAs -->
          <div class="flex gap-3 justify-center lg:justify-start pt-1">
            <NuxtLink
              to="/register"
              class="px-6 py-2.5 bg-white text-zinc-950 rounded-lg font-semibold transition text-sm shadow-lg shadow-black/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.45)]"
            >
              Get started free
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="px-6 py-2.5 text-zinc-200 hover:text-white border border-zinc-700 hover:border-cyan-500 hover:shadow-[0_0_0_3px_rgba(34,211,238,0.14)] rounded-lg transition text-sm bg-zinc-900/80 backdrop-blur-sm"
            >
              Sign in
            </NuxtLink>
          </div>
        </div>

        <!-- Right column: video -->
        <div class="relative">
          <!-- Soft cyan glow halo behind the video -->
          <div class="absolute -inset-6 bg-cyan-500/[0.08] rounded-[2rem] blur-2xl pointer-events-none" />
          <video
            v-if="hasDemoVideo"
            controls
            playsinline
            :poster="demoPosterSrc"
            class="relative w-full aspect-video rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/60"
          >
            <source :src="demoVideoSrc" type="video/mp4" />
            <track
              kind="subtitles"
              label="English"
              srclang="en"
              src="/filemcp.en.vtt"
              default
            />
            Your browser does not support the video tag.
          </video>
          <div
            v-else
            class="relative w-full aspect-video rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center shadow-2xl shadow-black/60"
          >
            <div class="text-center space-y-4">
              <div class="w-16 h-16 mx-auto rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center">
                <svg class="w-7 h-7 text-zinc-500 ml-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p class="text-zinc-400 text-sm font-medium">Demo coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== The loop ===== -->
    <section class="relative px-4 pb-24 overflow-hidden">
      <!-- Subtle violet accent in the background -->
      <div class="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-[600px] h-[300px] rounded-full bg-violet-500/[0.06] blur-[120px]" />

      <div class="relative max-w-5xl mx-auto">
        <div class="text-center space-y-3 mb-12">
          <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1] text-white">
            Generate. Publish. Revise.
          </h2>
          <p class="text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Your agent ships. Reviewers comment. Your agent reads the feedback and ships again — at the same URL, with every version preserved.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="step in steps"
            :key="step.n"
            class="group relative p-[1px] rounded-xl bg-gradient-to-br from-cyan-500/50 via-zinc-700 to-violet-500/50 hover:from-cyan-500/60 hover:to-violet-500/60 transition"
          >
            <div class="h-full rounded-[11px] bg-zinc-950/95 backdrop-blur-sm p-6">
              <div class="text-xs font-mono text-cyan-400/80 mb-3 tracking-widest">{{ step.n }}</div>
              <h3 class="text-lg font-semibold text-white mb-2">{{ step.title }}</h3>
              <p class="text-sm text-zinc-400 leading-relaxed">{{ step.body }}</p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-center gap-2 mt-8 text-zinc-400 text-sm">
          <svg class="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
          </svg>
          <span>And again. Same URL, all versions preserved.</span>
        </div>
      </div>
    </section>

    <!-- ===== Get started — hosted vs self-host ===== -->
    <section class="relative px-4 pt-12 pb-28">
      <div class="relative max-w-5xl mx-auto space-y-12">
        <div class="text-center space-y-3">
          <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1] text-white">
            Get started.
          </h2>
          <p class="text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Use the hosted version, or run FileMCP on your own infrastructure.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Hosted -->
          <NuxtLink
            to="/register"
            class="group relative block p-[1px] rounded-xl bg-gradient-to-br from-cyan-500/60 via-zinc-700 to-cyan-500/40 hover:from-cyan-500/80 hover:to-cyan-500/60 transition"
          >
            <div class="h-full rounded-[11px] bg-zinc-950/95 backdrop-blur-sm p-7 flex flex-col gap-5">
              <div class="text-xs font-mono text-cyan-400/80 tracking-widest uppercase">Hosted</div>
              <div class="space-y-2 flex-1">
                <h3 class="text-2xl font-semibold text-white">Use FileMCP</h3>
                <p class="text-zinc-400 leading-relaxed">Free to start. No setup. Live in 30 seconds.</p>
              </div>
              <span class="inline-flex items-center justify-center px-5 py-2.5 bg-white text-zinc-950 rounded-lg font-semibold text-sm group-hover:shadow-[0_0_30px_rgba(34,211,238,0.45)] transition self-start">
                Get started free
              </span>
            </div>
          </NuxtLink>

          <!-- Self-host -->
          <a
            href="https://github.com/filemcp/filemcp"
            target="_blank"
            rel="noopener"
            class="group relative block p-[1px] rounded-xl bg-gradient-to-br from-violet-500/50 via-zinc-700 to-violet-500/30 hover:from-violet-500/70 hover:to-violet-500/50 transition"
          >
            <div class="h-full rounded-[11px] bg-zinc-950/95 backdrop-blur-sm p-7 flex flex-col gap-5">
              <div class="text-xs font-mono text-violet-300/80 tracking-widest uppercase">Self-host</div>
              <div class="space-y-2 flex-1">
                <h3 class="text-2xl font-semibold text-white">Run it yourself</h3>
                <p class="text-zinc-400 leading-relaxed">MIT licensed. Your infra, your data.</p>
              </div>
              <span class="inline-flex items-center gap-1.5 px-5 py-2.5 text-zinc-300 group-hover:text-white border border-zinc-800 group-hover:border-violet-500/40 rounded-lg transition text-sm bg-zinc-900/30 backdrop-blur-sm font-medium self-start">
                View on GitHub
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M7 17L17 7M17 7H8M17 7v9" />
                </svg>
              </span>
            </div>
          </a>
        </div>
      </div>
    </section>
  </div>
</template>
