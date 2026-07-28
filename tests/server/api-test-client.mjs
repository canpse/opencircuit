import { Readable } from 'node:stream';

export function createApiTestClient(handler, remoteAddress) {
  let cookie = '';

  return {
    setCookie(value) {
      cookie = value;
    },

    get cookie() {
      return cookie;
    },

    async call(path, init = {}) {
      const request = Readable.from(init.body ? [Buffer.from(init.body)] : []);
      request.url = path;
      request.method = init.method ?? 'GET';
      request.headers = cookie ? { cookie } : {};
      request.socket = { remoteAddress };

      let responseBody = '';
      const headers = new Map();
      const response = {
        statusCode: 200,
        setHeader(name, value) {
          headers.set(name.toLowerCase(), value);
        },
        end(value) {
          responseBody = value?.toString() ?? '';
        },
      };
      await handler(request, response);

      const setCookie = headers.get('set-cookie');
      if (typeof setCookie === 'string') cookie = setCookie.split(';', 1)[0];
      return {
        status: response.statusCode,
        headers,
        text: async () => responseBody,
        json: async () => JSON.parse(responseBody),
      };
    },
  };
}
