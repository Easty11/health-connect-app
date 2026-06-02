import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://health-app-backend-production-760e.up.railway.app';

const TOKEN_KEY = '@health_app_token';

const client = axios.create({ baseURL: BASE_URL });

// Attach token to every request automatically
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login(email, password) {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  console.log('api.login: POST /auth/login body:', params.toString());
  const { data } = await client.post('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  console.log('api.login: success, token length:', data.access_token?.length);
  await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
  return data.access_token;
}

export async function logout() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function syncHealthData(data) {
  console.log('Syncing data:', JSON.stringify(data, null, 2));
  try {
    const response = await client.post('/health-connect/sync', data);
    return response.data;
  } catch (error) {
    console.log('Sync error status:', error.response?.status);
    console.log('Sync error detail:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
}

export async function getSyncStatus() {
  const { data } = await client.get('/health-connect/status');
  return data;
}

export default client;
