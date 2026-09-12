export const environment = {
  production: true,
  apiUrl: import.meta.env.NG_APP_API_URL,
  wsUrl: import.meta.env.NG_APP_WS_URL,
  demoLoginEnabled: import.meta.env.NG_APP_DEMO_LOGIN_ENABLED !== 'false',
  demoPassword: import.meta.env.NG_APP_DEMO_PASSWORD ?? '',
};
