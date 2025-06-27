import { Module } from '@nestjs/common';
import { websocketController } from 'src/controller/web-socket';
import { ChatGateway } from 'src/gateway/web-socket.gateway';

@Module({

  providers: [ ChatGateway ],
  controllers: [ websocketController ]

})
export class WebSocketModule {}
