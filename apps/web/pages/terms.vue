<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

useSeoMeta({
  title: 'Terms of Use — FileMCP',
  description: 'The terms governing your use of FileMCP.',
})

const lastUpdated = '2026-04-26'
</script>

<template>
  <div class="px-4 py-16 sm:py-20">
    <article class="max-w-3xl mx-auto prose prose-invert prose-zinc prose-headings:font-semibold prose-headings:text-white prose-p:text-zinc-300 prose-a:text-cyan-300 hover:prose-a:text-cyan-200 prose-strong:text-white">
      <p class="text-cyan-300/80 text-xs uppercase tracking-[0.2em] font-medium not-prose mb-3">Legal</p>
      <h1 class="!text-4xl !font-semibold !tracking-tight">Terms of Use</h1>
      <p class="text-zinc-500 text-sm">Last updated: {{ lastUpdated }}</p>

      <h2>1. Agreement</h2>
      <p>
        These Terms of Use (the "Terms") govern your access to and use of the FileMCP service (the "Service") operated by NSpark, Inc. ("NSpark," "we," "us," or "our"). By accessing or using the Service, you agree to be bound by these Terms.
      </p>

      <h2>2. The Service</h2>
      <p>
        FileMCP is a hosting and collaboration platform for AI-generated artifacts. Users may upload files (HTML, Markdown, JSON, and other supported formats), share them via generated links, leave inline comments, and maintain version history.
      </p>
      <p>
        A self-hosted, open-source distribution of FileMCP is available under the MIT License at <a href="https://github.com/filemcp/filemcp" target="_blank" rel="noopener">github.com/filemcp/filemcp</a>. These Terms apply only to the hosted Service operated by NSpark.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You must register an account to use most features of the Service. You are responsible for maintaining the confidentiality of your account credentials and API keys, and for all activity that occurs under your account.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>upload, host, or share content that infringes on third-party intellectual property or privacy rights;</li>
        <li>upload malware, phishing content, or content intended to harm users or systems;</li>
        <li>publish content that is illegal in your jurisdiction or in the United States;</li>
        <li>circumvent rate limits, quotas, or other technical restrictions;</li>
        <li>resell or redistribute the Service without our written permission.</li>
      </ul>
      <p>
        We reserve the right to remove content and suspend or terminate accounts that violate these Terms, with or without notice.
      </p>

      <h2>5. Your Content</h2>
      <p>
        You retain ownership of all content you upload to the Service. By uploading content, you grant NSpark a non-exclusive, worldwide license to host, render, transcode, and display that content as required to operate the Service for you and your designated viewers.
      </p>
      <p>
        Public and unlisted assets may be accessible to anyone with a link. You are responsible for ensuring that any content you mark as public or unlisted is appropriate for that visibility.
      </p>

      <h2>6. Service Availability</h2>
      <p>
        The Service is provided "as is" and "as available." We do not warrant uninterrupted availability and are not liable for downtime, data loss, or failure to meet a particular performance level.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may stop using the Service at any time and delete your account from your dashboard. We may suspend or terminate your access to the Service for violation of these Terms, suspected fraud, non-payment, or to comply with legal obligations.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, NSpark shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our aggregate liability for any claim arising from these Terms shall not exceed the amount you paid us in the twelve months preceding the claim, or USD 100 if the Service was used at no charge.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms. Material changes will be communicated by email to account holders or by notice on the Service.
      </p>

      <h2>10. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict-of-law principles.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms can be sent to <a href="mailto:contact@nforce.ai">contact@nforce.ai</a>.
      </p>
      <p>
        NSpark, Inc.<br>
        8 The Green #19869, Dover, DE 19901, United States
      </p>
    </article>
  </div>
</template>
