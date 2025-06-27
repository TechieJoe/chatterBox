import { Test, TestingModule } from '@nestjs/testing';
import { join } from 'path';
const request = require('supertest');
import { Module } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { websocketController } from './controller/web-socket';

@Module({
  controllers: [websocketController],
})
class TestModule {}

describe('App Integration (GET /chat)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();

    // Serve static files from the public directory
    app.useStaticAssets(join(__dirname, '..', 'public'));

    await app.init();
  });

  it('GET /chat should return index.html with 200 status', async () => {
    const res = await request(app.getHttpServer()).get('/chat');

    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text).toContain('<!DOCTYPE html>');
  });

  afterAll(async () => {
    await app.close();
  });
});
