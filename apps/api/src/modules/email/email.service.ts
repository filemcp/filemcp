import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import * as fs from 'fs'
import * as path from 'path'
import mjml2html from 'mjml'

type Vars = Record<string, string | number>

interface SendOptions {
  to: string
  subject: string
  template: string
  vars: Vars
  // Optional plain-text fallback. Falls back to a stripped-down version of the HTML if omitted.
  text?: string
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name)
  private ses: SESv2Client | null = null
  private dryRun = true
  private fromAddress = ''
  private fromName = ''
  private appUrl = ''

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.dryRun = this.config.get('EMAIL_DRY_RUN', 'false') === 'true'
    this.fromAddress = this.config.get('EMAIL_FROM_ADDRESS', 'noreply@filemcp.com')
    this.fromName = this.config.get('EMAIL_FROM_NAME', 'FileMCP')
    this.appUrl = this.config.get('APP_URL', 'http://localhost:3000')

    if (!this.dryRun) {
      this.ses = new SESv2Client({
        region: this.config.get('SES_REGION', 'us-east-1'),
        credentials: {
          accessKeyId: this.config.get('SES_ACCESS_KEY_ID', ''),
          secretAccessKey: this.config.get('SES_SECRET_ACCESS_KEY', ''),
        },
      })
    }
  }

  // Fire-and-forget convenience for the welcome email.
  async sendWelcome(to: string, username: string) {
    return this.send({
      to,
      subject: `Welcome to FileMCP, ${username}`,
      template: 'welcome',
      vars: { username },
    })
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    return this.send({
      to,
      subject: 'Reset your FileMCP password',
      template: 'password-reset',
      vars: { resetUrl },
    })
  }

  async sendInvitation(opts: {
    to: string
    orgName: string
    inviterName: string
    roleLabel: string
    inviteUrl: string
  }) {
    return this.send({
      to: opts.to,
      subject: `${opts.inviterName} invited you to ${opts.orgName} on FileMCP`,
      template: 'invitation',
      vars: {
        orgName: opts.orgName,
        inviterName: opts.inviterName,
        roleLabel: opts.roleLabel,
        inviteUrl: opts.inviteUrl,
      },
    })
  }

  async sendAssetShared(opts: {
    to: string
    senderName: string
    assetTitle: string
    assetUrl: string
    note?: string
    viewMode: 'comments' | 'view'
  }) {
    const introLine =
      opts.viewMode === 'view'
        ? 'They sent you a read-only link — open it to view the asset in your browser.'
        : "They sent you a link to view the asset and leave inline comments — no account required."

    const notePartial = opts.note
      ? `<mj-section padding-top="20px">
           <mj-column>
             <mj-text color="#fafafa" font-size="15px" line-height="1.6">
               <div style="border-left: 2px solid #06b6d4; padding: 4px 0 4px 14px; font-style: italic;">${this.escapeHtml(opts.note)}</div>
             </mj-text>
           </mj-column>
         </mj-section>`
      : ''

    return this.send({
      to: opts.to,
      subject: `${opts.senderName} shared "${opts.assetTitle}" on FileMCP`,
      template: 'asset-shared',
      vars: {
        senderName: opts.senderName,
        assetTitle: opts.assetTitle,
        assetUrl: opts.assetUrl,
        introLine,
        notePartial,
      },
    })
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  async send(opts: SendOptions): Promise<void> {
    const html = await this.render(opts.template, opts.vars)
    const text = opts.text ?? this.htmlToText(html)
    const fromHeader = `${this.fromName} <${this.fromAddress}>`

    if (this.dryRun) {
      if (process.env.NODE_ENV !== 'production') this.previewLocally(opts, html)
      return
    }

    const inlineImages: Array<{ cid: string; filename: string; data: Buffer; type: string }> = []
    const logo = this.getLogoBuffer()
    if (logo) {
      inlineImages.push({ cid: 'logo', filename: 'logo.png', data: logo, type: 'image/png' })
    }

    const rawMessage = this.buildRawMessage({
      from: fromHeader,
      to: opts.to,
      subject: opts.subject,
      html,
      text,
      inlineImages,
    })

    try {
      await this.ses!.send(
        new SendEmailCommand({
          Destination: { ToAddresses: [opts.to] },
          Content: { Raw: { Data: rawMessage } },
        }),
      )
      this.logger.log(`Sent ${opts.template} to ${opts.to}`)
    } catch (err: any) {
      this.logger.error(`Failed to send ${opts.template} to ${opts.to}: ${err?.message ?? err}`)
    }
  }

  private logoBuffer: Buffer | null = null

  private getLogoBuffer(): Buffer | null {
    if (this.logoBuffer) return this.logoBuffer
    // Logo lives in the web app's public dir; both apps share the monorepo root
    const candidates = [
      path.resolve(process.cwd(), '..', 'web', 'public', 'logo.png'),
      path.resolve(process.cwd(), 'apps', 'web', 'public', 'logo.png'),
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.logoBuffer = fs.readFileSync(p)
        return this.logoBuffer
      }
    }
    this.logger.warn('Logo file not found for email embedding')
    return null
  }

  private async render(template: string, vars: Vars): Promise<string> {
    const file = path.join(__dirname, 'templates', `${template}.mjml`)
    let source = fs.readFileSync(file, 'utf8')

    // Substitute tokens BEFORE compiling so partials containing MJML markup
    // (e.g. notePartial in asset-shared) get compiled along with the rest.
    // Keys ending with "Partial" are treated as raw MJML; everything else is HTML-escaped.
    const allVars: Vars = {
      appUrl: this.appUrl,
      // Reference the logo via its Content-ID — set as an inline MIME attachment in send()
      logoSrc: 'cid:logo',
      year: new Date().getFullYear(),
      ...vars,
    }
    for (const [key, value] of Object.entries(allVars)) {
      const stringified = String(value)
      const replacement = key.endsWith('Partial') ? stringified : this.escapeHtml(stringified)
      source = source.replaceAll(`{{${key}}}`, replacement)
    }

    const result = await mjml2html(source, { validationLevel: 'soft' })
    if (result.errors.length > 0) {
      this.logger.warn(
        `MJML warnings in ${template}: ${result.errors.map((e: { message: string }) => e.message).join(', ')}`,
      )
    }
    return result.html
  }

  // Build a multipart/related raw MIME message with HTML body + plain-text alternative + inline attachment(s).
  // Format: multipart/related → [ multipart/alternative → [text, html], image attachments ]
  private buildRawMessage(opts: {
    from: string
    to: string
    subject: string
    html: string
    text: string
    inlineImages: Array<{ cid: string; filename: string; data: Buffer; type: string }>
  }): Buffer {
    const ts = Date.now()
    const outer = `outer_${ts}`
    const alt = `alt_${ts}`
    const subjectEncoded = `=?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`

    const lines: string[] = [
      `From: ${opts.from}`,
      `To: ${opts.to}`,
      `Subject: ${subjectEncoded}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/related; boundary="${outer}"`,
      '',
      `--${outer}`,
      `Content-Type: multipart/alternative; boundary="${alt}"`,
      '',
      `--${alt}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      opts.text,
      '',
      `--${alt}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      opts.html,
      '',
      `--${alt}--`,
      '',
    ]

    for (const img of opts.inlineImages) {
      const b64 = img.data.toString('base64').match(/.{1,76}/g)!.join('\r\n')
      lines.push(
        `--${outer}`,
        `Content-Type: ${img.type}; name="${img.filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-ID: <${img.cid}>`,
        `Content-Disposition: inline; filename="${img.filename}"`,
        '',
        b64,
        '',
      )
    }

    lines.push(`--${outer}--`)
    return Buffer.from(lines.join('\r\n'), 'utf8')
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private previewLocally(opts: SendOptions, html: string) {
    // Browsers can't resolve cid: URIs, so swap the logo to a base64 data URI
    // for the local preview file only. Real email clients use the CID attachment.
    const logo = this.getLogoBuffer()
    let previewHtml = html
    if (logo) {
      const dataUri = `data:image/png;base64,${logo.toString('base64')}`
      previewHtml = html.replaceAll('cid:logo', dataUri)
    }

    const dir = path.join(process.cwd(), 'tmp')
    fs.mkdirSync(dir, { recursive: true })
    const outFile = path.join(dir, `last-email-${opts.template}.html`)
    fs.writeFileSync(outFile, previewHtml, 'utf8')
    this.logger.log(
      `[preview] ${opts.template} → ${opts.to} | ${opts.subject} | ${outFile}`,
    )
  }
}
