import { io } from 'socket.io-client';

const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
const wsUrl = process.env.WS_URL ?? 'http://localhost:3001';

async function main() {
  const loginResponse = await fetch(`${apiUrl}/api/v1/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@acme.dev' }),
  });

  if (!loginResponse.ok) {
    console.error('Login failed:', loginResponse.status);
    process.exit(1);
  }

  const { data } = await loginResponse.json();
  const accessToken = data?.accessToken;
  if (!accessToken) {
    console.error('Login response missing access token');
    process.exit(1);
  }

  await new Promise((resolve, reject) => {
    const socket = io(wsUrl, {
      auth: { token: accessToken },
      transports: ['websocket'],
      timeout: 5000,
    });

    const fail = (message) => {
      socket.disconnect();
      reject(new Error(message));
    };

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.disconnect();
      resolve(undefined);
    });

    socket.on('connect_error', (error) => {
      fail(error.message);
    });

    setTimeout(() => fail('Connection timed out'), 6000);
  });

  console.log('Socket gateway verification passed');
}

main().catch((error) => {
  console.error('Socket gateway verification failed:', error.message);
  process.exit(1);
});
