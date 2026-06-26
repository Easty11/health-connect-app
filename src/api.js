import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform, DeviceEventEmitter } from 'react-native';

const { HRVCapture } = NativeModules;

async function mirrorTokenToNative(token) {
  if (Platform.OS === 'android' && HRVCapture?.storeAuthToken) {
    try { await HRVCapture.storeAuthToken(token); } catch (_) {}
  }
}

async function clearNativeToken() {
  if (Platform.OS === 'android' && HRVCapture?.clearAuthToken) {
    try { await HRVCapture.clearAuthToken(); } catch (_) {}
  }
}

const BASE_URL = 'https://health-app-backend-production-760e.up.railway.app';

const TOKEN_KEY = '@health_app_token';
const USERNAME_KEY = '@health_app_username';

const client = axios.create({ baseURL: BASE_URL });

// Attach token to every request automatically
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, the stored token is no longer valid — clear it and notify the app.
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeMany([TOKEN_KEY, USERNAME_KEY]);
      DeviceEventEmitter.emit('AuthExpired');
    }
    return Promise.reject(error);
  }
);

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
  await mirrorTokenToNative(data.access_token);
  return data.access_token;
}

export async function logout() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await clearNativeToken();
}

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function syncHealthData(data, token) {
  console.log('Syncing data:', JSON.stringify(data, null, 2));
  try {
    // When a token is passed explicitly, send it directly; otherwise the
    // request interceptor falls back to the stored token.
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const response = await client.post('/health-connect/sync', data, config);
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
