import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface ClientData {
  username: string;
  lastMessageTime: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket']
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clients = new Map<string, ClientData>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const user = this.clients.get(client.id);
    if (user) {
      this.server.emit('systemMessage', `${user.username} left the chat`);
      this.clients.delete(client.id);
      this.updateUserList();
    }
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() username: string, @ConnectedSocket() client: Socket) {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      throw new WsException('Invalid username');
    }

    // Prevent duplicate joins
    if (this.clients.has(client.id)) {
      return { status: 'error', message: 'Already joined' };
    }

    // Check if username is already taken
    const existingUser = Array.from(this.clients.values()).find(u => u.username === username);
    if (existingUser) {
      throw new WsException('Username is already taken');
    }

    this.clients.set(client.id, { 
      username: username.trim(), 
      lastMessageTime: 0 
    });
    
    this.server.emit('systemMessage', `${username} joined the chat`);
    this.updateUserList();
    
    return { status: 'success' };
  }

  private updateUserList() {
    const userList = Array.from(this.clients.values()).map(u => u.username);
    this.server.emit('userList', userList);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() payload: { id: string, message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.clients.get(client.id);
    if (!user) {
      throw new WsException('User not registered');
    }

    const now = Date.now();
    if (now - user.lastMessageTime < 1000) {
      throw new WsException('You are sending messages too quickly.');
    }

    if (!payload.message || typeof payload.message !== 'string' || payload.message.trim() === '') {
      throw new WsException('Message cannot be empty');
    }

    user.lastMessageTime = now;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Broadcast to all EXCEPT the sender
    client.broadcast.emit('receiveMessage', {
      id: payload.id,
      sender: user.username,
      message: payload.message,
      time
    });
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() payload: { username: string }, @ConnectedSocket() client: Socket) {
    const user = this.clients.get(client.id);
    if (user) {
      client.broadcast.emit('typing', { username: user.username });
    }
  }
}