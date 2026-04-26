// @ts-nocheck
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import { OrgRole } from '@prisma/client'
import { AssetsService } from '../assets/assets.service'
import { CommentsService } from '../comments/comments.service'
import { PrismaService } from '../../prisma/prisma.service'

const TOOLS = [
  {
    name: 'upload_asset',
    description:
      'Upload a file to filemcp and get back a shareable URL. Returns a curl command — run it with Bash to perform the upload. Supports HTML, Markdown, JSON, CSS, JS, SVG, and plain text. Requires WRITE or OWNER role. Maximum file size: 5MB.',
    inputSchema: {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Absolute path to the file on disk, e.g. "/home/user/deck.html"',
        },
        filename: {
          type: 'string',
          description: 'Filename with extension, e.g. "deck.html". Used to detect the file type.',
        },
      },
      required: ['filepath', 'filename'],
    },
  },
  {
    name: 'list_assets',
    description: 'List your uploaded assets on filemcp.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        limit: { type: 'number', description: 'Results per page, max 50 (default: 20)' },
      },
    },
  },
  {
    name: 'get_asset',
    description:
      'Download the content of an asset from filemcp. Returns the raw file content so you can read or edit it. Use this when you want to work on an existing asset.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Asset slug' },
        version: { type: 'number', description: 'Version number (omit for latest)' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'read_asset_comments',
    description:
      'Read inline feedback left on an asset by viewers. Returns threaded comments with author, date, version, position/line anchor, resolved status, and replies. Use this to incorporate reviewer feedback before publishing a new version.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Asset slug' },
        unresolved_only: {
          type: 'boolean',
          description: 'If true, only return unresolved comments (default: false).',
        },
        since_version: {
          type: 'number',
          description:
            'Only return comments made on this version number or later. Useful after publishing a new version to see what feedback came in on it.',
        },
      },
      required: ['slug'],
    },
  },
]

const MIME_TYPES: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  md: 'text/markdown',
  markdown: 'text/markdown',
  json: 'application/json',
  txt: 'text/plain',
  css: 'text/css',
  js: 'text/javascript',
  ts: 'text/plain',
  svg: 'image/svg+xml',
}

@Injectable()
export class McpService {
  constructor(
    private assets: AssetsService,
    private comments: CommentsService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async handle(req: Request & { user: any }, res: Response) {
    const body = req.body
    const { method, params, id } = body

    console.log('[MCP]', method, id != null ? `id=${id}` : '(notification)')

    if (id == null) {
      res.status(202).set('Connection', 'close').end()
      return
    }

    try {
      const result = await this.dispatch(method, params, req)
      res.set('Connection', 'close').json({ jsonrpc: '2.0', id, result })
    } catch (err: any) {
      console.error('[MCP] error in', method, err?.message)
      res.set('Connection', 'close').json({
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message: err?.message ?? 'Internal error' },
      })
    }
  }

  private async dispatch(method: string, params: any, req: Request & { user: any }) {
    switch (method) {
      case 'initialize':
        return {
          protocolVersion: params?.protocolVersion ?? '2025-11-25',
          capabilities: { tools: {} },
          serverInfo: { name: 'filemcp', version: '0.0.1' },
        }

      case 'tools/list':
        return { tools: TOOLS }

      case 'tools/call':
        return this.callTool(params.name, params.arguments ?? {}, req)

      case 'ping':
        return {}

      default:
        throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 })
    }
  }

  private async callTool(name: string, args: any, req: Request & { user: any }) {
    const { orgId, orgSlug, role } = await this.resolveOrgContext(req)

    if (name === 'upload_asset') {
      if (role === OrgRole.READ) {
        throw new Error('Your API key has read-only access. Upload requires WRITE or OWNER role.')
      }

      const { filepath, filename } = args
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'txt'
      const mime = MIME_TYPES[ext] ?? 'text/plain'
      const token = req.headers.authorization
      const apiBase = `${this.config.get('API_URL')}/api`

      const mcpMaxMb = this.config.get<number>('MCP_MAX_FILE_SIZE_MB', 5)
      const cmd = `curl -s -X POST "${apiBase}/orgs/${orgSlug}/assets" -H "Authorization: ${token}" -H "X-Upload-Source: mcp" -F "file=@${filepath};type=${mime}"`

      console.log('[MCP] upload_asset curl', { filepath, filename, orgSlug })

      return {
        content: [
          {
            type: 'text',
            text: `Run this command to upload (max ${mcpMaxMb}MB):\n\n${cmd}\n\nThe JSON response will contain the asset \`url\` and \`versionUrl\`.`,
          },
        ],
      }
    }

    if (name === 'list_assets') {
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 20, 50)
      const result = await this.assets.listByOrg(orgId, page, limit)

      if (result.items.length === 0) {
        return { content: [{ type: 'text', text: 'No assets found.' }] }
      }

      const lines = result.items.map(
        (a) => `• ${a.slug} — "${a.title}" (v${a.latestVersion}, updated ${new Date(a.updatedAt).toLocaleDateString()})`,
      )
      lines.push(`\nShowing ${result.items.length} of ${result.total} total (page ${result.page}).`)
      return { content: [{ type: 'text', text: lines.join('\n') }] }
    }

    if (name === 'get_asset') {
      const { slug, version } = args
      const { data, contentType } = await this.assets.streamContent(orgSlug, slug, version, req.user.id)
      const text = data.toString('utf8')

      return {
        content: [
          {
            type: 'text',
            text: `Content of "${slug}"${version ? ` (v${version})` : ' (latest)'}:\n\n${text}`,
          },
        ],
      }
    }

    if (name === 'read_asset_comments') {
      const { slug, unresolved_only, since_version } = args
      const asset = await this.prisma.asset.findUnique({
        where: { orgId_slug: { orgId, slug } },
      })
      if (!asset) {
        return { content: [{ type: 'text', text: `No asset found with slug "${slug}".` }] }
      }

      const comments = await this.comments.list(
        asset.id,
        unresolved_only ? false : undefined,
        req.user.id,
        { sinceVersion: typeof since_version === 'number' ? since_version : undefined },
      )

      if (comments.length === 0) {
        const filters: string[] = []
        if (unresolved_only) filters.push('unresolved')
        if (typeof since_version === 'number') filters.push(`since v${since_version}`)
        const filterNote = filters.length ? ` (${filters.join(', ')})` : ''
        return {
          content: [
            { type: 'text', text: `No comments on "${asset.title}" (slug: ${slug})${filterNote}.` },
          ],
        }
      }

      return {
        content: [{ type: 'text', text: this.formatComments(asset.title, slug, comments) }],
      }
    }

    throw new Error(`Unknown tool: ${name}`)
  }

  private formatComments(title: string, slug: string, comments: any[]): string {
    const total = comments.length
    const unresolved = comments.filter((c) => !c.resolved).length
    const resolved = total - unresolved

    const out: string[] = []
    out.push(`${total} comment${total === 1 ? '' : 's'} on "${title}" (slug: ${slug}):`)
    out.push('')
    out.push('────────')

    comments.forEach((c, i) => {
      const author = this.formatAuthor(c)
      const date = new Date(c.createdAt).toISOString().slice(0, 10)
      const status = c.resolved ? 'resolved' : 'UNRESOLVED'
      const anchor = this.formatAnchor(c)
      const versionTag = c.versionNumber != null ? `on v${c.versionNumber}` : null
      const meta = [author, date, status, versionTag, anchor].filter(Boolean).join(' · ')
      out.push(`[${i + 1}] ${meta}`)
      out.push(this.indent(c.body, 4))

      for (const reply of c.replies ?? []) {
        const ra = this.formatAuthor(reply)
        const rd = new Date(reply.createdAt).toISOString().slice(0, 10)
        out.push('')
        out.push(`    ↳ ${ra} · ${rd}`)
        out.push(this.indent(reply.body, 6))
      }
      out.push('')
    })

    out.push('────────')
    out.push(`${unresolved} unresolved · ${resolved} resolved`)
    return out.join('\n')
  }

  private formatAuthor(c: any): string {
    if (c.author?.username) return `@${c.author.username}`
    return `${c.anonName ?? 'anonymous'} (anonymous)`
  }

  private formatAnchor(c: any): string | null {
    if (c.anchorType === 'POSITION' && c.xPct != null && c.yPct != null) {
      // xPct/yPct are stored as 0..1 fractions
      return `pos ${Math.round(c.xPct * 100)}%×${Math.round(c.yPct * 100)}%`
    }
    if (c.anchorType === 'LINE_RANGE' && c.lineStart != null) {
      return c.lineEnd && c.lineEnd !== c.lineStart
        ? `lines ${c.lineStart}-${c.lineEnd}`
        : `line ${c.lineStart}`
    }
    return null
  }

  private indent(text: string, spaces: number): string {
    const pad = ' '.repeat(spaces)
    return text
      .split('\n')
      .map((l) => pad + l)
      .join('\n')
  }

  private async resolveOrgContext(req: Request & { user: any }) {
    // API key auth: org context already on the user object
    if (req.user.orgId) {
      return { orgId: req.user.orgId, orgSlug: req.user.orgSlug, role: req.user.role as OrgRole }
    }

    // JWT auth: find the user's first (personal) org
    const member = await this.prisma.orgMember.findFirst({
      where: { userId: req.user.id },
      include: { org: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!member) throw new Error('No organization found. Create an org first.')

    return { orgId: member.orgId, orgSlug: member.org.slug, role: member.role as OrgRole }
  }
}
