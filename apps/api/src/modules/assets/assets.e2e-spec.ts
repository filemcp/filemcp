jest.mock('../render/render.service', () => ({
  RenderService: class MockRenderService {
    markdownToHtml = jest.fn().mockResolvedValue('<p>ok</p>')
  },
}))

import request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { createTestApp } from '../../test/app.factory'
import { createUser, authHeader, TestUser } from '../../test/auth.helper'

describe('AssetsController (e2e)', () => {
  let app: INestApplication
  let user: TestUser

  beforeAll(async () => {
    const built = await createTestApp()
    app = built.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    user = await createUser(app)
  })

  function htmlBuffer() {
    return Buffer.from('<h1>Test</h1>')
  }

  describe('POST /api/orgs/:slug/assets', () => {
    it('201 — uploads a file and returns url', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/orgs/${user.orgSlug}/assets`)
        .set(authHeader(user.token))
        .attach('file', htmlBuffer(), { filename: 'deck.html', contentType: 'text/html' })
        .expect(201)

      expect(res.body.url).toBeDefined()
      expect(res.body.version).toBe(1)
    })

    it('401 — no auth', async () => {
      await request(app.getHttpServer())
        .post(`/api/orgs/${user.orgSlug}/assets`)
        .attach('file', htmlBuffer(), { filename: 'deck.html', contentType: 'text/html' })
        .expect(401)
    })

    it('403 — user is not a member of the org', async () => {
      const other = await createUser(app)
      await request(app.getHttpServer())
        .post(`/api/orgs/${user.orgSlug}/assets`)
        .set(authHeader(other.token))
        .attach('file', htmlBuffer(), { filename: 'deck.html', contentType: 'text/html' })
        .expect(403)
    })
  })

  describe('GET /api/orgs/:slug/assets', () => {
    it('200 — returns asset list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/orgs/${user.orgSlug}/assets`)
        .set(authHeader(user.token))
        .expect(200)

      expect(Array.isArray(res.body.items)).toBe(true)
    })

    it('401 — no auth', async () => {
      await request(app.getHttpServer())
        .get(`/api/orgs/${user.orgSlug}/assets`)
        .expect(401)
    })
  })

  describe('DELETE /api/orgs/:slug/assets/:id', () => {
    it('204 — deletes the asset', async () => {
      const upload = await request(app.getHttpServer())
        .post(`/api/orgs/${user.orgSlug}/assets`)
        .set(authHeader(user.token))
        .attach('file', htmlBuffer(), { filename: 'to-delete.html', contentType: 'text/html' })
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/api/orgs/${user.orgSlug}/assets/${upload.body.assetId}`)
        .set(authHeader(user.token))
        .expect(204)
    })
  })
})
