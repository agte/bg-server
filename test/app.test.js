const assert = require('assert');
const axios = require('axios');
const app = require('../src/app.js');

describe('Feathers application', () => {
  let server;

  before(async () => {
    server = app.listen(0);
    axios.defaults.baseURL = `http://localhost:${server.address().port}`;
  });

  after(() => {
    server.close();
  });

  it('starts and shows the index page', async () => {
    const { data } = await axios.get('/');
    assert.ok(data.includes('<html lang="en">'));
  });

  it('shows a 404 JSON error without stack trace', async () => {
    try {
      await axios.get('/path/to/nowhere');
      assert.fail('should never get here');
    } catch ({ response }) {
      assert.equal(response.status, 404);
      assert.equal(response.data.code, 404);
      assert.equal(response.data.message, 'Page not found');
      assert.equal(response.data.name, 'NotFound');
    }
  });
});
