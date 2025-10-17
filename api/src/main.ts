import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { ENV } from './env';

const { PORT } = ENV;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true });

  // Récupérer l'instance Express
  const server = app.getHttpAdapter().getInstance();

  // Middleware pour servir Angular sauf pour /api
  server.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/api')) return next();
    express.static(join(__dirname, '..', '..', 'views'))(req, res, next);
  });

  // Pour toutes les autres routes Angular (HTML5 routing)
  // server.get('*', (req: any, res: any) => {
  //   res.sendFile(join(__dirname, '..', '..', 'views', 'index.html'));
  // });
  server.get(/^(?!\/api).*/, (req: any, res: any) => {
    res.sendFile(join(__dirname, '..', '..', 'views', 'index.html'));
  });


  const port = PORT || 3000;
  app.listen(4899, '0.0.0.0', () => console.log('Server running on', 'http://localhost:' + port));

}

bootstrap();
