import { PrismaClient } from '@prisma/client'

const dbHost = process.env.DB_HOST ?? 'localhost'
process.env.DATABASE_URL = `postgresql://filemcp:filemcp@${dbHost}:5432/filemcp_test`
process.env.JWT_SECRET = 'test-secret'
process.env.JWT_ACCESS_EXPIRES_IN = '1h'
process.env.S3_BUCKET = 'test-bucket'
process.env.S3_PUBLIC_URL = 'http://localhost:9000/test-bucket'
process.env.S3_ACCESS_KEY = 'test'
process.env.S3_SECRET_KEY = 'test-secret'
process.env.APP_URL = 'http://localhost:3000'
process.env.API_URL = 'http://localhost:4000'

const prisma = new PrismaClient()

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "Comment", "Version", "ApiKey", "Asset", "OrgMember", "Organization", "User"
    RESTART IDENTITY CASCADE
  `)
})

afterAll(async () => {
  await prisma.$disconnect()
})
