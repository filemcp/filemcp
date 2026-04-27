<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const description = 'How FileMCP collects, uses, and protects your data.'
const config = useRuntimeConfig()
const ogImageUrl = `${config.public.appUrl}/og.jpg`

useSeoMeta({
  title: 'Privacy Policy — FileMCP',
  description,
  ogTitle: 'Privacy Policy — FileMCP',
  ogDescription: description,
  ogImage: ogImageUrl,
  ogImageType: 'image/jpeg',
  ogImageWidth: 1600,
  ogImageHeight: 840,
  twitterTitle: 'Privacy Policy — FileMCP',
  twitterDescription: description,
  twitterImage: ogImageUrl,
})

const lastUpdated = '2026-04-26'
</script>

<template>
  <div class="px-4 py-16 sm:py-20">
    <article class="max-w-3xl mx-auto prose prose-invert prose-zinc prose-headings:font-semibold prose-headings:text-white prose-p:text-zinc-300 prose-a:text-cyan-300 hover:prose-a:text-cyan-200 prose-strong:text-white">
      <p class="text-cyan-300/80 text-xs uppercase tracking-[0.2em] font-medium not-prose mb-3">Legal</p>
      <h1 class="!text-4xl !font-semibold !tracking-tight">Privacy Policy</h1>
      <p class="text-zinc-500 text-sm">Last updated: {{ lastUpdated }}</p>

      <p>
        This Privacy Policy describes how NSpark, Inc. ("NSpark," "we," "us," or "our") collects, uses, and shares information when you use the FileMCP service (the "Service").
      </p>

      <h2>1. Information We Collect</h2>

      <h3>Information you provide</h3>
      <ul>
        <li><strong>Account information:</strong> email address, username, and a hashed password.</li>
        <li><strong>Organization information:</strong> organization name, slug, and members.</li>
        <li><strong>Uploaded content:</strong> the files you upload to the Service, including their content and metadata.</li>
        <li><strong>Comments:</strong> comments you post on assets, including your display name (or anonymous name) and optional email.</li>
        <li><strong>API keys:</strong> name and prefix metadata; the secret portion of the key is stored hashed.</li>
      </ul>

      <h3>Information collected automatically</h3>
      <ul>
        <li><strong>Usage data:</strong> pages viewed, asset views, requests made to our API.</li>
        <li><strong>Technical data:</strong> IP address, browser type, device information.</li>
        <li><strong>Cookies and similar technologies:</strong> session cookies for authentication, analytics cookies (see below).</li>
      </ul>

      <h3>Analytics</h3>
      <p>
        We use Google Analytics to understand aggregate Service usage. Google Analytics may collect information such as IP address, device identifiers, and browsing behavior subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google's privacy policy</a>.
      </p>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>To operate, maintain, and improve the Service;</li>
        <li>To authenticate you and authorize access to your organization's resources;</li>
        <li>To render and host the content you upload;</li>
        <li>To deliver comments and notifications;</li>
        <li>To enforce our Terms of Use and protect against abuse;</li>
        <li>To communicate with you about the Service (e.g., security notices, billing, product updates).</li>
      </ul>

      <h2>3. Sharing</h2>
      <p>We do not sell your personal information. We share information only as needed to operate the Service:</p>
      <ul>
        <li><strong>Infrastructure providers:</strong> hosting, storage (S3-compatible), and database providers under contract.</li>
        <li><strong>Analytics providers:</strong> Google Analytics, as described above.</li>
        <li><strong>Legal compliance:</strong> when required to comply with applicable law, regulation, legal process, or governmental request.</li>
        <li><strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of assets, with notice to affected users.</li>
      </ul>

      <h2>4. Public and Unlisted Content</h2>
      <p>
        Assets you mark as <strong>public</strong> or <strong>unlisted</strong> are accessible to anyone with the URL. Comments left on those assets are visible to other viewers. You are responsible for the content you choose to make public or unlisted.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain account information for as long as your account is active. Uploaded content and comments are retained until you delete them or your account. Backups may retain data for up to 30 days after deletion. Anonymized aggregate analytics may be retained indefinitely.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        Depending on your jurisdiction, you may have the right to access, correct, delete, port, or restrict processing of your personal information. You can manage and delete most of your data directly from your dashboard. For other requests, contact <a href="mailto:contact@nforce.ai">contact@nforce.ai</a>.
      </p>

      <h2>7. Security</h2>
      <p>
        We use industry-standard technical and organizational measures to protect your data, including encryption in transit, hashed passwords, and access controls. No system is fully secure; we cannot guarantee absolute security.
      </p>

      <h2>8. Children</h2>
      <p>
        The Service is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will delete it.
      </p>

      <h2>9. International Transfers</h2>
      <p>
        We may process your information in the United States and other countries. By using the Service, you consent to the transfer of your information to countries that may have different data-protection laws than your country of residence.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be communicated by email to account holders or by notice on the Service.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about this Privacy Policy can be sent to <a href="mailto:contact@nforce.ai">contact@nforce.ai</a>.
      </p>
      <p>
        NSpark, Inc.<br>
        8 The Green #19869, Dover, DE 19901, United States
      </p>
    </article>
  </div>
</template>
