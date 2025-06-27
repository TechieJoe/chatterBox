// src/chat.gateway.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { createMock } from '@golevelup/ts-jest';
import { WsException } from '@nestjs/websockets';
import { ChatGateway } from './web-socket.gateway';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let server: Server;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatGateway],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    server = createMock<Server>();
    gateway.server = server;
  });

  it('should handle join with valid username', () => {
    const client = { id: 'abc' } as any;
    const result = gateway.handleJoin('John', client);
    const clientData = gateway['clients'].get('abc');
    expect(clientData?.username).toBe('John');
    expect(result).toEqual({ status: 'success' });
    expect(server.emit).toHaveBeenCalledWith('systemMessage', 'John joined the chat');
  });

  it('should throw if join username is invalid', () => {
    const client = { id: 'abc' } as any;
    expect(() => gateway.handleJoin('', client)).toThrow(WsException);
    expect(() => gateway.handleJoin(null as any, client)).toThrow(WsException);
  });

  it('should prevent duplicate client joins', () => {
    const client = { id: '123' } as any;
    gateway['clients'].set('123', { username: 'Alice', lastMessageTime: 0 });
    
    const result = gateway.handleJoin('Alice', client);
    expect(result).toEqual({ status: 'error', message: 'Already joined' });
  });

  it('should prevent duplicate usernames', () => {
    const client1 = { id: '123' } as any;
    const client2 = { id: '456' } as any;
    
    gateway.handleJoin('Alice', client1);
    expect(() => gateway.handleJoin('Alice', client2)).toThrow(WsException);
  });

  it('should handle message from registered user', () => {
    const client = { id: '123', broadcast: { emit: jest.fn() } } as any;
    gateway['clients'].set('123', { username: 'Alice', lastMessageTime: 0 });
    const payload = { id: 'msg1', message: 'Hello' };
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    gateway.handleMessage(payload, client);
    const clientData = gateway['clients'].get('123');
    expect(clientData?.lastMessageTime).toBe(now);
    expect(client.broadcast.emit).toHaveBeenCalledWith('receiveMessage', {
      id: 'msg1',
      sender: 'Alice',
      message: 'Hello',
      time: expect.any(String)
    });
  });

  it('should rate limit messages', () => {
    const client = { id: '123' } as any;
    const now = Date.now();
    gateway['clients'].set('123', { username: 'Alice', lastMessageTime: now });

    expect(() =>
      gateway.handleMessage({ id: 'msg1', message: 'Hello' }, client),
    ).toThrow(WsException);
  });

  it('should reject empty messages', () => {
    const client = { id: '456' } as any;
    gateway['clients'].set('456', { username: 'Bob', lastMessageTime: 0 });

    expect(() =>
      gateway.handleMessage({ id: 'msg1', message: '' }, client),
    ).toThrow(WsException);
  });

  it('should reject messages from unregistered users', () => {
    const client = { id: '789' } as any;
    expect(() =>
      gateway.handleMessage({ id: 'msg1', message: 'Hello' }, client),
    ).toThrow(WsException);
  });

  it('should broadcast typing event', () => {
    const broadcast = { emit: jest.fn() };
    const client = { id: '789', broadcast } as any;
    gateway['clients'].set('789', { username: 'Charlie', lastMessageTime: 0 });

    gateway.handleTyping({ username: 'Charlie' }, client);
    expect(broadcast.emit).toHaveBeenCalledWith('typing', { username: 'Charlie' });
  });

  it('should update user list on join and disconnect', () => {
    const client1 = { id: '123' } as any;
    const client2 = { id: '456' } as any;
    
    // First join
    gateway.handleJoin('Alice', client1);
    expect(server.emit).toHaveBeenCalledWith('userList', ['Alice']);
    
    // Second join
    gateway.handleJoin('Bob', client2);
    expect(server.emit).toHaveBeenCalledWith('userList', ['Alice', 'Bob']);
    
    // Disconnect
    gateway.handleDisconnect(client1);
    expect(server.emit).toHaveBeenCalledWith('systemMessage', 'Alice left the chat');
    expect(server.emit).toHaveBeenCalledWith('userList', ['Bob']);
  });

  it('should handle disconnect for unregistered user', () => {
    const client = { id: '999' } as any;
    expect(() => gateway.handleDisconnect(client)).not.toThrow();
  });
});