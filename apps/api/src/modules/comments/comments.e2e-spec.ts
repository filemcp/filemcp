jest.mock('../render/render.service', () => ({
  RenderService: class MockRenderService {
    markdownToHtml = jest.fn().mockResolvedValue('<p>ok</p>')
  },
}))

import request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { AnchorType } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { createTestApp } from '../../test/app.factory'
import { createUser, authHeader, TestUser } from '../../test/auth.helper'

describe('CommentsController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let user: TestUser
  let publicAssetId: string
  let publicVersionId: string
  let privateAssetId: string
  let privateVersionId: string

  beforeAll(async () => {
    const built = await createTestApp()
    app = built.app
    prisma = built.module.get(PrismaService)
  })

  afterAll(async () => {
    await app.close()
  })

  async function seedVersion(assetId: string) {
    const v = await prisma.version.create({
      data: { assetId, number: 1, fileType: 'HTML', storagePath: `${assetId}/v1.html`, sizeBytes: 100 },
    })
    return v.id
  }

  beforeEach(async () => {
    user = await createUser(app)
    const org = await prisma.organization.findUnique({ where: { slug: user.orgSlug } })
    const pub = await prisma.asset.create({
      data: { slug: 'pub-asset', orgId: org!.id, visibility: 'PUBLIC' },
    })
    publicAssetId = pub.id
    publicVersionId = await seedVersion(pub.id)
    const priv = await prisma.asset.create({
      data: { slug: 'priv-asset', orgId: org!.id, visibility: 'PRIVATE' },
    })
    privateAssetId = priv.id
    privateVersionId = await seedVersion(priv.id)
  })

  const anchor = { anchorType: AnchorType.POSITION, xPct: 0.5, yPct: 0.5, selectorHint: '' }

  describe('GET /api/assets/:assetId/comments', () => {
    it('200 — public asset, no auth', async () => {
      await prisma.comment.create({ data: { assetId: publicAssetId, versionId: publicVersionId, body: 'hi', ...anchor } })
      const res = await request(app.getHttpServer())
        .get(`/api/assets/${publicAssetId}/comments`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
    })

    it('404 — private asset, no auth', async () => {
      await request(app.getHttpServer())
        .get(`/api/assets/${privateAssetId}/comments`)
        .expect(404)
    })

    it('200 — private asset, org member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/assets/${privateAssetId}/comments`)
        .set(authHeader(user.token))
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('POST /api/assets/:assetId/comments', () => {
    const anchorBody = { anchorType: 'POSITION', xPct: 0.5, yPct: 0.5, selectorHint: '' }

    it('201 — anonymous comment on public asset', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/assets/${publicAssetId}/comments`)
        .send({ body: 'anonymous comment', anonName: 'Visitor', versionId: publicVersionId, ...anchorBody })
        .expect(201)

      expect(res.body.comment.body).toBe('anonymous comment')
      expect(res.body.comment.versionNumber).toBe(1)
    })

    it('404 — anonymous comment on private asset', async () => {
      await request(app.getHttpServer())
        .post(`/api/assets/${privateAssetId}/comments`)
        .send({ body: 'sneaky', anonName: 'Hacker', versionId: privateVersionId, ...anchorBody })
        .expect(404)
    })

    it('400 — anonymous comment without anonName', async () => {
      await request(app.getHttpServer())
        .post(`/api/assets/${publicAssetId}/comments`)
        .send({ body: 'no name', versionId: publicVersionId, ...anchorBody })
        .expect(400)
    })

    it('400 — top-level comment without versionId', async () => {
      await request(app.getHttpServer())
        .post(`/api/assets/${publicAssetId}/comments`)
        .send({ body: 'no version', anonName: 'Visitor', ...anchorBody })
        .expect(400)
    })
  })
})
