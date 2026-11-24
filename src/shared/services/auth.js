import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { apiRequest } from './apiClient';
import { createAuthService } from './authService';

const TOKEN_KEY = 'fisilab_session';
// En web la sesión solo dura mientras la app permanece abierta.
let webToken = null;
const storage = {
  async getToken() {
    return Platform.OS === 'web' ? webToken : SecureStore.getItemAsync(TOKEN_KEY);
  },
  async setToken(token) {
    if (Platform.OS === 'web') webToken = token;
    else await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async removeToken() {
    if (Platform.OS === 'web') webToken = null;
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

export const authService = createAuthService(apiRequest, storage);
