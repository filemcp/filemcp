import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap() {
  const isDev = !['production', 'staging'].includes(process.env.NODE_ENV ?? '')
  const app = await NestFactory.create(AppModule, {
    logger: isDev
      ? ['log', 'warn', 'error', 'debug', 'verbose']
      : ['log', 'warn', 'error'],
  })

  app.setGlobalPrefix('api')
  app.use(cookieParser())

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? process.env.APP_URL ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())

  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  })

  const swagger = new DocumentBuilder()
    .setTitle('filemcp API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, swagger)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 4000
  await app.listen(port, '0.0.0.0')
  new Logger('Bootstrap').log(`API running on http://localhost:${port}`)
}

bootstrap()
