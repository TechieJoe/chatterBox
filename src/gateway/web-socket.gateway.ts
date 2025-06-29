import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger('ChatGateway');

  private users = new Map<string, string>(); // socketId => username
  private sockets = new Map<string, string>(); // username => socketId

  afterInit(server: Server) {
    this.logger.log('WebSocket initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const username = this.users.get(client.id);
    if (username) {
      this.users.delete(client.id);
      this.sockets.delete(username);
      this.broadcastUserList();
      this.server.emit('systemMessage', `${username} left the chat.`);
      this.logger.log(`Client disconnected: ${username} (${client.id})`);
    }
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, username: string) {
    const existingSocket = this.sockets.get(username);
    
    if (existingSocket && existingSocket !== client.id) {
      // Disconnect old socket if same user tries to join from another tab/window
      const oldClient = this.server.sockets.sockets.get(existingSocket);
      if (oldClient) oldClient.disconnect();
    }

    this.users.set(client.id, username);
    this.sockets.set(username, client.id);

    this.logger.log(`${username} joined with socket ${client.id}`);
    this.server.emit('systemMessage', `${username} joined the chat`);
    this.broadcastUserList();
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    client: Socket,
    payload: { id: string; message: string }
  ): void {
    const username = this.users.get(client.id);
    if (!username) return;

    const msg = {
      id: payload.id,
      sender: username,
      message: payload.message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    this.server.emit('receiveMessage', msg);
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, payload: { username: string }) {
    client.broadcast.emit('typing', payload);
  }

  @SubscribeMessage('deleteMessage')
  handleDeleteMessage(client: Socket, payload: { messageId: string }) {
    this.server.emit('deleteMessage', payload);
  }

  private broadcastUserList() {
    const usernames = [...this.sockets.keys()];
    this.server.emit('userList', usernames);
  }
}
