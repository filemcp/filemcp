<script setup lang="ts">
definePageMeta({ middleware: 'guest' })

const auth = useAuthStore()
const route = useRoute()
const inviteToken = computed(() => (route.query.invite as string) ?? null)
const email = ref('')
const password = ref('')
const loading = ref(false)
const { fieldErrors, topError, setFromException, clearField, reset } = useFormErrors()

const inputBase = 'w-full px-4 py-3 bg-zinc-900 text-white rounded-lg border focus:outline-none transition'
const inputOk = 'border-zinc-800 focus:border-cyan-500 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.14)]'
const inputErr = 'border-red-500/70 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]'

async function submit() {
  reset()
  loading.value = true
  try {
    const config = useRuntimeConfig()
    const res = await $fetch<{ accessToken: string; user: any }>(
      `${config.public.apiUrl}/auth/login`,
      { method: 'POST', body: { email: email.value, password: password.value } },
    )
    auth.setSession(res.accessToken, res.user)

    // If signing in to accept an invitation, route to the invite page so the user
    // can confirm + accept (handles email-mismatch checks server-side).
    if (inviteToken.value) {
      await navigateTo(`/invite/${inviteToken.value}`)
      return
    }
    await navigateTo('/dashboard')
  } catch (e: any) {
    setFromException(e, 'Login failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
    <div class="w-full max-w-sm space-y-6">
      <div class="flex justify-center">
        <NuxtLink to="/" class="inline-block select-none">
          <img src="/logo.png" alt="FileMCP" class="h-8 w-auto" />
        </NuxtLink>
      </div>
      <h1 class="text-2xl font-bold text-white text-center">Sign in</h1>
      <div
        v-if="inviteToken"
        class="text-xs text-cyan-300/80 bg-cyan-500/[0.04] border border-cyan-500/30 rounded-lg px-3 py-2 leading-relaxed"
      >
        Sign in to accept your workspace invitation.
      </div>
      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <input
            v-model="email"
            type="email"
            placeholder="Email"
            :class="[inputBase, fieldErrors.email ? inputErr : inputOk]"
            @input="clearField('email')"
          />
          <p v-if="fieldErrors.email" class="text-red-400 text-xs mt-1.5 px-1">{{ fieldErrors.email[0] }}</p>
        </div>
        <div>
          <input
            v-model="password"
            type="password"
            placeholder="Password"
            :class="[inputBase, fieldErrors.password ? inputErr : inputOk]"
            @input="clearField('password')"
          />
          <p v-if="fieldErrors.password" class="text-red-400 text-xs mt-1.5 px-1">{{ fieldErrors.password[0] }}</p>
        </div>
        <p v-if="topError" class="text-red-400 text-sm">{{ topError }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 bg-white text-zinc-950 rounded-lg font-semibold hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(34,211,238,0.45)] transition disabled:opacity-50"
        >
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
        <p class="text-center">
          <NuxtLink to="/forgot-password" class="text-zinc-500 hover:text-zinc-300 text-xs transition">
            Forgot password?
          </NuxtLink>
        </p>
      </form>
      <p class="text-zinc-500 text-sm text-center">
        No account?
        <NuxtLink to="/register" class="text-zinc-300 hover:text-white">Create one</NuxtLink>
      </p>
    </div>
  </div>
</template>
