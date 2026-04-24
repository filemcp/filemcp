jest.mock('../render/render.service', () => ({
  RenderService: class MockRenderService {
    markdownToHtml = jest.fn()
  },
}))

import request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { createTestApp } from '../../test/app.factory'

describe('AuthController (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const built = await createTestApp()
    app = built.app
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/auth/register', () => {
    it('201 — registers a user and returns a token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'alice@test.com', username: 'alice', password: 'password123' })
        .expect(201)

      expect(res.body.accessToken).toBeDefined()
      expect(res.body.user.username).toBe('alice')
    })

    it('409 — duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'dup@test.com', username: 'dupuser1', password: 'password123' })
        .expect(201)

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'dup@test.com', username: 'dupuser2', password: 'password123' })
        .expect(409)
    })

    it('400 — missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'no-password@test.com', username: 'nopw' })
        .expect(400)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'login@test.com', username: 'loginuser', password: 'correct123' })
        .expect(201)
    })

    it('200 — valid credentials return token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'correct123' })
        .expect(200)

      expect(res.body.accessToken).toBeDefined()
    })

    it('401 — wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'wrongpassword' })
        .expect(401)
    })

    it('401 — unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' })
        .expect(401)
    })
  })
})
