<script setup lang="ts">
definePageMeta({ middleware: 'guest' })

const route = useRoute()
const auth = useAuthStore()
const email = ref((route.query.prefill_email as string) ?? '')
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const config = useRuntimeConfig()
    const res = await $fetch<{ accessToken: string; user: any }>(
      `${config.public.apiUrl}/auth/register`,
      { method: 'POST', body: { email: email.value, username: username.value, password: password.value } },
    )
    auth.setSession(res.accessToken, res.user)
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
    <div class="w-full max-w-sm space-y-6">
      <h1 class="text-2xl font-bold text-white text-center">Create account</h1>
      <form class="space-y-4" @submit.prevent="submit">
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="w-full px-4 py-3 bg-zinc-900 text-white rounded-lg border border-zinc-800 focus:outline-none focus:border-zinc-600"
        />
        <input
          v-model="username"
          type="text"
          placeholder="Username"
          class="w-full px-4 py-3 bg-zinc-900 text-white rounded-lg border border-zinc-800 focus:outline-none focus:border-zinc-600"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password (8+ chars)"
          class="w-full px-4 py-3 bg-zinc-900 text-white rounded-lg border border-zinc-800 focus:outline-none focus:border-zinc-600"
        />
        <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 bg-white text-zinc-950 rounded-lg font-semibold hover:bg-zinc-100 transition disabled:opacity-50"
        >
          {{ loading ? 'Creating account…' : 'Create account' }}
        </button>
      </form>
      <p class="text-zinc-500 text-sm text-center">
        Already have an account?
        <NuxtLink to="/login" class="text-zinc-300 hover:text-white">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>
