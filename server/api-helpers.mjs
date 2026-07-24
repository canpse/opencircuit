export const MAX_BODY_BYTES = 2 * 1024 * 1024;
export const OWNER_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,127}$/;

export async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('too large');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function send(response, status, value) {
  response.statusCode = status;
  response.end(status === 204 ? undefined : JSON.stringify(value));
  return true;
}
