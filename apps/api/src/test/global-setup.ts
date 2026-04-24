import { execSync } from 'child_process'

export default async function globalSetup() {
  const dbHost = process.env.DB_HOST ?? 'localhost'
  process.env.DATABASE_URL = `postgresql://filemcp:filemcp@${dbHost}:5432/filemcp_test`
  execSync('pnpm exec prisma migrate deploy', {
    cwd: `${__dirname}/../../`,
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: 'inherit',
  })
}
