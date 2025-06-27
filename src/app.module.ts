import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebSocketModule } from './module/web-socket.module.ts.module';
import { websocketController } from './controller/web-socket';
import { ChatGateway } from './gateway/web-socket.gateway';

@Module({
  imports: [WebSocketModule],
  controllers: [AppController, websocketController],
  providers: [AppService, ChatGateway],
})
export class AppModule {}
