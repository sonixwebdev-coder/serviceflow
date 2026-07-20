const express = require('express');
const request = require('supertest');

const { createApiHealthHandler } = require('../../src/health/apiHealth');

describe('API health integration', () => {
  it('serves the configured platform health response through Express', async () => {
    const app = express();
    app.get('/api/health', createApiHealthHandler());

    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'ServiceFlow API is healthy',
      data: { timestamp: expect.any(String) },
    });
  });
});
