import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
const compression = require('compression');
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({ origin: '*' });
  app.use(compression());

  app.enableCors({
    origin: '*', // Adjust this in production for security
  });
  
  // Serve static assets
  const publicPath = join(__dirname, '..', 'public');
  app.useStaticAssets(publicPath);

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Chat App API')
    .setDescription('API docs for the chat application')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Serve at /api

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`App running at http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api`);
}
bootstrap();
