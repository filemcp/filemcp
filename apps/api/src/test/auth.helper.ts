import { INestApplication } from '@nestjs/common'
import request from 'supertest'

export interface TestUser {
  token: string
  userId: string
  username: string
  orgSlug: string
}

let counter = 0

export async function createUser(app: INestApplication, overrides?: Partial<{ username: string; orgName: string }>): Promise<TestUser> {
  counter++
  const username = overrides?.username ?? `testuser${counter}`
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      email: `${username}@test.com`,
      username,
      password: 'password123',
      orgName: overrides?.orgName ?? username,
    })
    .expect(201)

  return {
    token: res.body.accessToken,
    userId: res.body.user.id,
    username,
    orgSlug: username,
  }
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}
