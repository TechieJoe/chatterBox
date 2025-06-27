import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { join } from 'path';
import { websocketController } from './web-socket';

describe('websocketController (unit)', () => {
  let controller: websocketController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [websocketController],
    }).compile();

    controller = moduleRef.get<websocketController>(websocketController);
  });

  it('should send index.html file from /public directory', () => {
    // Mock the response object
    const sendFileMock = jest.fn();
    const res = { sendFile: sendFileMock } as unknown as Response;

    controller.getChatPage(res);

    expect(sendFileMock).toHaveBeenCalledWith(
      join(__dirname, '..', '..', 'public', 'index.html')
    );
  });
});
