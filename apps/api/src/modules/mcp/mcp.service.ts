// @ts-nocheck
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import { OrgRole } from '@prisma/client'
import { AssetsService } from '../assets/assets.service'
import { PrismaService } from '../../prisma/prisma.service'

const TOOLS = [
  {
    name: 'upload_asset',
    description:
      'Upload a file to cdnmcp and get back a shareable URL. Returns a curl command — run it with Bash to perform the upload. Supports HTML, Markdown, JSON, CSS, JS, SVG, and plain text. Requires WRITE or OWNER role. Maximum file size: 5MB.',
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
        slug: {
          type: 'string',
          description: 'Custom URL slug (optional). Generated automatically if omitted.',
          pattern: '^[a-z0-9-]+$',
        },
      },
      required: ['filepath', 'filename'],
    },
  },
  {
    name: 'list_assets',
    description: 'List your uploaded assets on cdnmcp.',
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
      'Download the content of an asset from cdnmcp. Returns the raw file content so you can read or edit it. Use this when you want to work on an existing asset.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Asset slug' },
        version: { type: 'number', description: 'Version number (omit for latest)' },
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
          serverInfo: { name: 'cdnmcp', version: '0.0.1' },
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

      const { filepath, filename, slug } = args
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'txt'
      const mime = MIME_TYPES[ext] ?? 'text/plain'
      const token = req.headers.authorization
      const apiBase = `${req.protocol}://${req.get('host')}/api`

      const baseSlug = filename.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      const resolvedSlug = slug ?? `${baseSlug}-${ext}`

      const mcpMaxMb = this.config.get<number>('MCP_MAX_FILE_SIZE_MB', 5)
      const fields = [`-F "file=@${filepath};type=${mime}"`, `-F "slug=${resolvedSlug}"`]
      const cmd = `curl -s -X POST "${apiBase}/orgs/${orgSlug}/assets" -H "Authorization: ${token}" -H "X-Upload-Source: mcp" ${fields.join(' ')}`

      console.log('[MCP] upload_asset curl', { filepath, filename, slug, orgSlug })

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

    throw new Error(`Unknown tool: ${name}`)
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
