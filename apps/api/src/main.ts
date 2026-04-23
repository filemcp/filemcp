import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api')

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
    .setTitle('cdnmcp API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, swagger)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 4000
  await app.listen(port, '0.0.0.0')
  console.log(`API running on http://localhost:${port}`)
}

bootstrap()
