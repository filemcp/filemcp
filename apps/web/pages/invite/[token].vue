<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const token = route.params.token as string

const auth = useAuthStore()
const config = useRuntimeConfig()

const { data, error: loadError, refresh } = await useAsyncData(`invite-${token}`, () =>
  $fetch<{
    id: string
    email: string
    role: string
    roleLabel: string
    status: string
    expiresAt: string
    org: { slug: string; name: string }
    invitedBy: { username: string }
  }>(`${config.public.apiUrl}/invitations/${token}`),
)

useSeoMeta({
  title: () =>
    data.value
      ? `Join ${data.value.org.name} on FileMCP`
      : 'Workspace invitation — FileMCP',
})

const accepting = ref(false)
const declining = ref(false)
const actionError = ref('')

const isPending = computed(() => data.value?.status === 'PENDING')
const isAuth = computed(() => auth.isAuthenticated)
const emailMatches = computed(
  () => data.value && auth.user && auth.user.email.toLowerCase() === data.value.email.toLowerCase(),
)

async function accept() {
  if (!data.value) return
  actionError.value = ''
  accepting.value = true
  try {
    await $api(`/invitations/${token}/accept`, { method: 'POST' })
    auth.activeOrg = null as any
    // Reload memberships then route into that org's dashboard
    try {
      const me = await $api<{ orgs: any[] }>('/users/me')
      auth.setOrgs(me.orgs as any)
      auth.switchOrg(data.value.org.slug)
    } catch {}
    await router.push('/dashboard')
  } catch (e: any) {
    actionError.value = e?.data?.message ?? 'Could not accept invitation'
    accepting.value = false
  }
}

async function decline() {
  declining.value = true
  try {
    await $fetch(`${config.public.apiUrl}/invitations/${token}/decline`, { method: 'POST' })
    await refresh()
  } finally {
    declining.value = false
  }
}

const statusMessage = computed(() => {
  if (!data.value) return null
  switch (data.value.status) {
    case 'EXPIRED':
      return 'This invitation has expired. Ask the workspace owner to send a new one.'
    case 'ACCEPTED':
      return 'This invitation has already been accepted.'
    case 'DECLINED':
      return 'This invitation was declined.'
    case 'REVOKED':
      return 'This invitation was revoked.'
    default:
      return null
  }
})
</script>

<template>
  <div class="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md space-y-8">
      <div class="flex justify-center">
        <NuxtLink to="/" class="inline-block select-none">
          <img src="/logo.png" alt="FileMCP" class="h-8 w-auto" />
        </NuxtLink>
      </div>

      <!-- Loading / not found -->
      <div v-if="loadError" class="text-center space-y-3">
        <h1 class="text-2xl font-bold text-white">Invitation not found</h1>
        <p class="text-zinc-400 text-sm">
          This invitation link is invalid or has been removed.
        </p>
        <NuxtLink to="/" class="text-zinc-300 hover:text-white text-sm underline-offset-2 hover:underline">
          Back to home
        </NuxtLink>
      </div>

      <!-- Active invitation -->
      <div v-else-if="data" class="relative p-[1px] rounded-2xl bg-gradient-to-br from-cyan-500/60 to-violet-500/60">
        <div class="rounded-[15px] bg-zinc-950/95 p-7 space-y-5">
          <div class="text-cyan-300/80 text-[11px] uppercase tracking-[0.2em] font-medium">
            Workspace invitation
          </div>

          <div class="space-y-2">
            <h1 class="text-2xl font-semibold text-white tracking-tight leading-snug">
              Join <span class="text-cyan-300">{{ data.org.name }}</span>
            </h1>
            <p class="text-zinc-400 text-sm leading-relaxed">
              <span class="text-zinc-300 font-medium">@{{ data.invitedBy.username }}</span>
              invited <span class="text-zinc-300 font-mono">{{ data.email }}</span>
              to join as a <span class="text-zinc-300 font-medium">{{ data.roleLabel }}</span>.
            </p>
          </div>

          <!-- Status banner if not pending -->
          <div
            v-if="!isPending"
            class="text-sm text-amber-300/90 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2"
          >
            {{ statusMessage }}
          </div>

          <!-- Action area -->
          <template v-else-if="isAuth && emailMatches">
            <div class="flex gap-2 pt-1">
              <button
                :disabled="accepting"
                class="flex-1 py-2.5 bg-white text-zinc-950 rounded-lg font-semibold text-sm hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(34,211,238,0.45)] transition disabled:opacity-50"
                @click="accept"
              >
                {{ accepting ? 'Accepting…' : 'Accept invitation' }}
              </button>
              <button
                :disabled="declining"
                class="px-4 py-2.5 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg transition text-sm bg-zinc-900/80 disabled:opacity-50"
                @click="decline"
              >
                Decline
              </button>
            </div>
            <p v-if="actionError" class="text-red-400 text-xs">{{ actionError }}</p>
          </template>

          <template v-else-if="isAuth && !emailMatches">
            <div class="text-sm text-amber-300/90 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2.5 leading-relaxed">
              You're signed in as <span class="font-mono text-amber-200">{{ auth.user?.email }}</span>, but this invitation was sent to <span class="font-mono text-amber-200">{{ data.email }}</span>. Sign out and sign in with the right account, or ask for a new invitation.
            </div>
            <button
              class="text-zinc-400 hover:text-white text-xs underline-offset-2 hover:underline transition"
              @click="auth.logout(); router.push(`/login`)"
            >
              Sign out
            </button>
          </template>

          <template v-else>
            <p class="text-zinc-400 text-sm leading-relaxed">
              To accept, sign in or create a FileMCP account.
            </p>
            <div class="flex gap-2 pt-1">
              <NuxtLink
                :to="`/register?invite=${token}&prefill_email=${encodeURIComponent(data.email)}`"
                class="flex-1 text-center py-2.5 bg-white text-zinc-950 rounded-lg font-semibold text-sm hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(34,211,238,0.45)] transition"
              >
                Create account
              </NuxtLink>
              <NuxtLink
                :to="`/login?invite=${token}`"
                class="px-4 py-2.5 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg transition text-sm bg-zinc-900/80"
              >
                Sign in
              </NuxtLink>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
