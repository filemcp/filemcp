import { Test } from '@nestjs/testing'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule } from '@nestjs/config'
import { AuthService } from './auth.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { EmailService } from '../email/email.service'

async function buildService() {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      PrismaModule,
      JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } }),
    ],
    providers: [
      AuthService,
      // Stubbed EmailService — register() fires the welcome email but tests don't need to assert delivery
      { provide: EmailService, useValue: { sendWelcome: async () => {}, send: async () => {} } },
    ],
  }).compile()
  return module.get(AuthService)
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    service = await buildService()
  })

  describe('register', () => {
    it('creates user, org, and member and returns a token', async () => {
      const result = await service.register({
        email: 'alice@test.com',
        username: 'alice',
        password: 'password123',
        orgName: 'alice',
      })
      expect(result.accessToken).toBeDefined()
      expect(result.user.username).toBe('alice')
    })

    it('throws ConflictException on duplicate email', async () => {
      await service.register({ email: 'dup@test.com', username: 'dup1', password: 'password123' })
      await expect(
        service.register({ email: 'dup@test.com', username: 'dup2', password: 'password123' }),
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException on duplicate username', async () => {
      await service.register({ email: 'a@test.com', username: 'samename', password: 'password123' })
      await expect(
        service.register({ email: 'b@test.com', username: 'samename', password: 'password123' }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('login', () => {
    beforeEach(async () => {
      await service.register({ email: 'login@test.com', username: 'loginuser', password: 'correct123' })
    })

    it('returns token on valid credentials', async () => {
      const result = await service.login('login@test.com', 'correct123')
      expect(result.accessToken).toBeDefined()
    })

    it('throws UnauthorizedException on wrong password', async () => {
      await expect(service.login('login@test.com', 'wrongpassword')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException for unknown email', async () => {
      await expect(service.login('nobody@test.com', 'password')).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('validateApiKey', () => {
    it('returns null for key without filemcp_ prefix', async () => {
      expect(await service.validateApiKey('random-key')).toBeNull()
    })

    it('returns null for well-formed but unknown key', async () => {
      const fakeKey = 'filemcp_' + 'a'.repeat(48)
      expect(await service.validateApiKey(fakeKey)).toBeNull()
    })
  })
})
