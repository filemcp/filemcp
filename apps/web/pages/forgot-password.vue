<script setup lang="ts">
definePageMeta({ middleware: 'guest' })

useSeoMeta({
  title: 'Forgot password — FileMCP',
})

const email = ref('')
const submitted = ref(false)
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
    await $fetch(`${config.public.apiUrl}/auth/forgot-password`, {
      method: 'POST',
      body: { email: email.value },
    })
    submitted.value = true
  } catch (e: any) {
    setFromException(e, 'Something went wrong')
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
        <h1 class="text-2xl font-bold text-white text-center">Forgot password?</h1>
        <p class="text-zinc-400 text-sm text-center leading-relaxed">
          Enter your email and we'll send you a link to reset your password.
        </p>

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
          <p v-if="topError" class="text-red-400 text-sm">{{ topError }}</p>
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 bg-white text-zinc-950 rounded-lg font-semibold hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(34,211,238,0.45)] transition disabled:opacity-50"
          >
            {{ loading ? 'Sending…' : 'Send reset link' }}
          </button>
        </form>
      </template>

      <template v-else>
        <div class="space-y-3 text-center">
          <h1 class="text-2xl font-bold text-white">Check your email</h1>
          <p class="text-zinc-400 text-sm leading-relaxed">
            If an account exists for <span class="text-zinc-200 font-mono">{{ email }}</span>, we've sent a link to reset your password. The link expires in 60 minutes.
          </p>
        </div>
      </template>

      <p class="text-zinc-500 text-sm text-center">
        Remember your password?
        <NuxtLink to="/login" class="text-zinc-300 hover:text-white">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>
