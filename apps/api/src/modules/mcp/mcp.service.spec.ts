// Mock before any import that transitively loads unified (ESM-only package)
jest.mock('../render/render.service', () => ({
  RenderService: class MockRenderService {
    markdownToHtml = jest.fn().mockResolvedValue('<p>ok</p>')
  },
}))

import { Test } from '@nestjs/testing'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { OrgRole } from '@prisma/client'
import { McpService } from './mcp.service'
import { AssetsService } from '../assets/assets.service'
import { CommentsService } from '../comments/comments.service'
import { PrismaService } from '../../prisma/prisma.service'

const mockAssets = {
  listByOrg: jest.fn(),
  streamContent: jest.fn(),
}
const mockComments = { list: jest.fn() }
const mockPrisma = {
  orgMember: { findFirst: jest.fn() },
  asset: { findFirst: jest.fn(), findUnique: jest.fn() },
}

async function buildService() {
  const module = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [
      McpService,
      { provide: AssetsService, useValue: mockAssets },
      { provide: CommentsService, useValue: mockComments },
      { provide: PrismaService, useValue: mockPrisma },
    ],
  }).compile()

  return module.get(McpService)
}

function makeReq(overrides: Partial<{ orgId: string; orgSlug: string; role: OrgRole; authorization: string }> = {}) {
  const { orgId = 'org-1', orgSlug = 'myorg', role = OrgRole.OWNER, authorization = 'Bearer token123' } = overrides
  return {
    user: { orgId, orgSlug, role },
    headers: { authorization },
    body: {},
  } as any
}

function makeRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.set = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.end = jest.fn().mockReturnValue(res)
  return res
}

describe('McpService', () => {
  let service: McpService

  beforeEach(async () => {
    service = await buildService()
    jest.clearAllMocks()
  })

  describe('register_asset', () => {
    it('returns JSON with the new asset entry when no prior manifest exists', async () => {
      const req = makeReq()
      const res = makeRes()
      req.body = {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'register_asset',
          arguments: { manifest_key: 'deck.html', uuid: 'abc-123' },
        },
      }
      await service.handle(req, res)
      const result = res.json.mock.calls[0][0].result
      expect(result.content[0].text).toContain('"deck.html": "abc-123"')
      expect(result.content[0].text).toContain('"version": 1')
    })

    it('preserves existing entries from current_manifest', async () => {
      const req = makeReq()
      const res = makeRes()
      req.body = {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'register_asset',
          arguments: {
            manifest_key: 'new.html',
            uuid: 'new-uuid',
            current_manifest: { version: 1, assets: { 'old.html': 'old-uuid' } },
          },
        },
      }
      await service.handle(req, res)
      const text = res.json.mock.calls[0][0].result.content[0].text
      expect(text).toContain('"old.html": "old-uuid"')
      expect(text).toContain('"new.html": "new-uuid"')
    })

    it('overwrites an existing entry when manifest_key already present', async () => {
      const req = makeReq()
      const res = makeRes()
      req.body = {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'register_asset',
          arguments: {
            manifest_key: 'deck.html',
            uuid: 'new-uuid',
            current_manifest: { version: 1, assets: { 'deck.html': 'old-uuid' } },
          },
        },
      }
      await service.handle(req, res)
      const parsed = JSON.parse(
        res.json.mock.calls[0][0].result.content[0].text.replace('Write this content to filemcp.json:\n\n', ''),
      )
      expect(parsed.assets['deck.html']).toBe('new-uuid')
    })

    it('handles nested manifest_key paths', async () => {
      const req = makeReq()
      const res = makeRes()
      req.body = {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'register_asset',
          arguments: { manifest_key: 'folder/deck.html', uuid: 'abc-456' },
        },
      }
      await service.handle(req, res)
      const text = res.json.mock.calls[0][0].result.content[0].text
      expect(text).toContain('"folder/deck.html": "abc-456"')
    })
  })

  describe('upload_asset', () => {
    it('returns a curl command targeting the uuid-based versions endpoint', async () => {
      const req = makeReq()
      const res = makeRes()
      req.body = {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'upload_asset',
          arguments: { filepath: '/tmp/deck.html', filename: 'deck.html', manifest_key: 'deck.html' },
        },
      }
      process.env.API_URL = 'http://localhost:3001'
      await service.handle(req, res)
      const text = res.json.mock.calls[0][0].result.content[0].text
      expect(text).toMatch(/curl -s -X POST.*\/assets\/[a-f0-9-]+\/versions/)
      expect(text).toContain('Bearer token123')
    })

    it('uses existing_uuid when provided (versioning an existing asset)', async () => {
      const existingUuid = '11111111-1111-1111-1111-111111111111'
      const req = makeReq()
      const res = makeRes()
      req.body = {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'upload_asset',
          arguments: {
            filepath: '/tmp/deck.html',
            filename: 'deck.html',
            manifest_key: 'deck.html',
            existing_uuid: existingUuid,
          },
        },
      }
      process.env.API_URL = 'http://localhost:3001'
      await service.handle(req, res)
      const text = res.json.mock.calls[0][0].result.content[0].text
      expect(text).toContain(existingUuid)
      expect(text).toContain('New version of existing asset')
    })

    it('generates a new uuid when no existing_uuid is given', async () => {
      const req = makeReq()
      const res = makeRes()
      req.body = {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'upload_asset',
          arguments: { filepath: '/tmp/deck.html', filename: 'deck.html', manifest_key: 'deck.html' },
        },
      }
      process.env.API_URL = 'http://localhost:3001'
      await service.handle(req, res)
      const text = res.json.mock.calls[0][0].result.content[0].text
      expect(text).toContain('New asset — UUID:')
    })

    it('instructs the agent to call register_asset after the curl', async () => {
      const req = makeReq()
      const res = makeRes()
      req.body = {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'upload_asset',
          arguments: { filepath: '/tmp/deck.html', filename: 'deck.html', manifest_key: 'deck.html' },
        },
      }
      process.env.API_URL = 'http://localhost:3001'
      await service.handle(req, res)
      const text = res.json.mock.calls[0][0].result.content[0].text
      expect(text).toContain('register_asset')
      expect(text).toContain('filemcp.json')
    })

    it('returns error when caller has READ-only role', async () => {
      const req = makeReq({ role: OrgRole.READ })
      const res = makeRes()
      req.body = {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'upload_asset',
          arguments: { filepath: '/tmp/deck.html', filename: 'deck.html', manifest_key: 'deck.html' },
        },
      }
      await service.handle(req, res)
      const body = res.json.mock.calls[0][0]
      expect(body.error).toBeDefined()
      expect(body.error.message).toContain('read-only')
    })
  })

  describe('tools/list', () => {
    it('includes upload_asset and register_asset in the tool list', async () => {
      const req = makeReq()
      const res = makeRes()
      req.body = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }
      await service.handle(req, res)
      const tools: Array<{ name: string }> = res.json.mock.calls[0][0].result.tools
      const names = tools.map((t) => t.name)
      expect(names).toContain('upload_asset')
      expect(names).toContain('register_asset')
    })

    it('upload_asset schema requires manifest_key', async () => {
      const req = makeReq()
      const res = makeRes()
      req.body = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }
      await service.handle(req, res)
      const tools: Array<{ name: string; inputSchema: any }> = res.json.mock.calls[0][0].result.tools
      const uploadTool = tools.find((t) => t.name === 'upload_asset')!
      expect(uploadTool.inputSchema.required).toContain('manifest_key')
    })
  })
})
