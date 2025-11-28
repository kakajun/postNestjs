import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  const config = new DocumentBuilder()
    .setTitle('WB Platform API')
    .setDescription('API 文档')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header', name: 'Authorization' }, 'bearer')
    .addApiKey({ type: 'apiKey', name: 'X-Token', in: 'header' }, 'x-token')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'post', // 出现在页面浏览器标签上显示的标题)
  })
  const port = Number(process.env.PORT)
  await app.listen(port)
  console.log(`http://localhost:${port}/docs`)
}

bootstrap()
