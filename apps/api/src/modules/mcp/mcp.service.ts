// @ts-nocheck
import { Injectable } from '@nestjs/common'
import type { Request, Response } from 'express'
import { AssetsService } from '../assets/assets.service'

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

const TOOLS = [
  {
    name: 'upload_asset',
    description:
      'Upload a file to cdnmcp and get back a shareable URL. Returns a curl command — run it with Bash to perform the upload. Supports HTML, Markdown, JSON, CSS, JS, SVG, and plain text.',
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
]

@Injectable()
export class McpService {
  constructor(private assets: AssetsService) {}

  async handle(req: Request & { user: { id: string; username: string } }, res: Response) {
    const body = req.body
    const { method, params, id } = body

    console.log('[MCP]', method, id != null ? `id=${id}` : '(notification)')

    // Notifications get 202, no body
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

  private async dispatch(method: string, params: any, req: Request & { user: { id: string; username: string } }) {
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

  private async callTool(name: string, args: any, req: Request & { user: { id: string; username: string } }) {
    if (name === 'upload_asset') {
      const { filepath, filename, slug } = args
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'txt'
      const mime = MIME_TYPES[ext] ?? 'text/plain'
      const token = req.headers.authorization
      const apiBase = `${req.protocol}://${req.get('host')}/api`

      const resolvedSlug = slug ?? filename.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

      const fields = [`-F "file=@${filepath};type=${mime}"`, `-F "slug=${resolvedSlug}"`]

      const cmd = `curl -s -X POST "${apiBase}/assets" -H "Authorization: ${token}" ${fields.join(' ')}`

      console.log('[MCP] upload_asset curl', { filepath, filename, slug })

      return {
        content: [
          {
            type: 'text',
            text: `Run this command to upload:\n\n${cmd}\n\nThe JSON response will contain the asset \`url\` and \`versionUrl\`.`,
          },
        ],
      }
    }

    if (name === 'list_assets') {
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 20, 50)
      const result = await this.assets.listOwned(req.user.id, page, limit)

      if (result.items.length === 0) {
        return { content: [{ type: 'text', text: 'No assets found.' }] }
      }

      const lines = result.items.map(
        (a) => `• ${a.slug} — "${a.title}" (v${a.latestVersion}, updated ${new Date(a.updatedAt).toLocaleDateString()})`,
      )
      lines.push(`\nShowing ${result.items.length} of ${result.total} total (page ${result.page}).`)
      return { content: [{ type: 'text', text: lines.join('\n') }] }
    }

    throw new Error(`Unknown tool: ${name}`)
  }
}
