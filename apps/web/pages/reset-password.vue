<script setup lang="ts">
definePageMeta({ middleware: 'guest' })

useSeoMeta({
  title: 'Reset password — FileMCP',
})

const route = useRoute()
const token = computed(() => (route.query.token as string) ?? '')

const password = ref('')
const submitted = ref(false)
const loading = ref(false)
const { fieldErrors, topError, setFromException, clearField, reset } = useFormErrors()

const inputBase = 'w-full px-4 py-3 bg-zinc-900 text-white rounded-lg border focus:outline-none transition'
const inputOk = 'border-zinc-800 focus:border-cyan-500 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.14)]'
const inputErr = 'border-red-500/70 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]'

async function submit() {
  reset()
  if (!token.value) {
    topError.value = 'Reset link is missing or invalid'
    return
  }
  loading.value = true
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.apiUrl}/auth/reset-password`, {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    submitted.value = true
  } catch (e: any) {
    setFromException(e, 'Reset failed')
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

      <template v-if="!submitted">
        <h1 class="text-2xl font-bold text-white text-center">Set a new password</h1>

        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <input
              v-model="password"
              type="password"
              placeholder="New password (8+ chars)"
              :class="[inputBase, fieldErrors.password ? inputErr : inputOk]"
              @input="clearField('password')"
            />
            <p v-if="fieldErrors.password" class="text-red-400 text-xs mt-1.5 px-1">{{ fieldErrors.password[0] }}</p>
          </div>
          <p v-if="topError" class="text-red-400 text-sm">{{ topError }}</p>
          <button
            type="submit"
            :disabled="loading || !token"
            class="w-full py-3 bg-white text-zinc-950 rounded-lg font-semibold hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(34,211,238,0.45)] transition disabled:opacity-50"
          >
            {{ loading ? 'Resetting…' : 'Reset password' }}
          </button>
        </form>
      </template>

      <template v-else>
        <div class="space-y-4 text-center">
          <h1 class="text-2xl font-bold text-white">Password updated</h1>
          <p class="text-zinc-400 text-sm">
            You can now sign in with your new password.
          </p>
          <NuxtLink
            to="/login"
            class="inline-block px-6 py-2.5 bg-white text-zinc-950 rounded-lg font-semibold hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(34,211,238,0.45)] transition text-sm"
          >
            Sign in
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>
