jest.mock('../render/render.service', () => ({
  RenderService: class MockRenderService {
    markdownToHtml = jest.fn().mockResolvedValue('<p>ok</p>')
  },
}))

import request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { createTestApp } from '../../test/app.factory'
import { createUser, authHeader, TestUser } from '../../test/auth.helper'

describe('VersionsController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let user: TestUser
  let publicAssetId: string
  let privateAssetId: string

  beforeAll(async () => {
    const built = await createTestApp()
    app = built.app
    prisma = built.module.get(PrismaService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    user = await createUser(app)
    const org = await prisma.organization.findUnique({ where: { slug: user.orgSlug } })

    const pub = await prisma.asset.create({
      data: { slug: 'pub-asset', orgId: org!.id, visibility: 'PUBLIC' },
    })
    publicAssetId = pub.id
    await prisma.version.create({
      data: {
        assetId: pub.id,
        number: 1,
        fileType: 'HTML',
        storagePath: 'assets/org/asset/v1/original.html',
        sizeBytes: 100,
      },
    })

    const priv = await prisma.asset.create({
      data: { slug: 'priv-asset', orgId: org!.id, visibility: 'PRIVATE' },
    })
    privateAssetId = priv.id
    await prisma.version.create({
      data: {
        assetId: priv.id,
        number: 1,
        fileType: 'HTML',
        storagePath: 'assets/org/asset/v1/original.html',
        sizeBytes: 100,
      },
    })
  })

  describe('GET /api/assets/:assetId/versions', () => {
    it('200 — public asset, no auth', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/assets/${publicAssetId}/versions`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body[0].number).toBe(1)
    })

    it('404 — private asset, no auth', async () => {
      await request(app.getHttpServer())
        .get(`/api/assets/${privateAssetId}/versions`)
        .expect(404)
    })

    it('200 — private asset, org member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/assets/${privateAssetId}/versions`)
        .set(authHeader(user.token))
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
    })
  })
})
