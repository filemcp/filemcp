// @ts-nocheck
import { Injectable } from '@nestjs/common'
import { z } from 'zod'
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
      'Upload a text file to cdnmcp and get back a shareable URL. Supports HTML, Markdown, JSON, CSS, JS, SVG, and plain text.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'File content as text' },
        filename: { type: 'string', description: 'Filename with extension, e.g. "deck.html"' },
        slug: {
          type: 'string',
          description: 'Custom URL slug (optional). Generated automatically if omitted.',
          pattern: '^[a-z0-9-]+$',
        },
      },
      required: ['content', 'filename'],
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
      const result = await this.dispatch(method, params, req.user)
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

  private async dispatch(method: string, params: any, user: { id: string; username: string }) {
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
        return this.callTool(params.name, params.arguments ?? {}, user)

      case 'ping':
        return {}

      default:
        throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 })
    }
  }

  private async callTool(name: string, args: any, user: { id: string; username: string }) {
    if (name === 'upload_asset') {
      const { content, filename, slug } = args
      console.log('[MCP] upload_asset', { filename, slug, contentLength: content?.length })

      const ext = filename.split('.').pop()?.toLowerCase() ?? 'txt'
      const mime = MIME_TYPES[ext] ?? 'text/plain'
      const buffer = Buffer.from(content, 'utf8')

      const result = await this.assets.upload(
        user.id,
        { buffer, mimetype: mime, originalname: filename, size: buffer.byteLength },
        { slug },
      )
      console.log('[MCP] upload complete', result)

      return {
        content: [
          {
            type: 'text',
            text: `Uploaded!\n\nURL: ${result.url}\nVersion: ${result.version}\nVersion URL: ${result.versionUrl}`,
          },
        ],
      }
    }

    if (name === 'list_assets') {
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 20, 50)
      const result = await this.assets.listOwned(user.id, page, limit)

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
