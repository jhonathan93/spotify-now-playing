const Config = require('../config/Config');

class SpotifyAuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SpotifyAuthError';
    }
}

class SpotifyClient {
    static REFRESH_TOKEN_URL = 'https://accounts.spotify.com/api/token';
    static NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
    static RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=10';
    static REQUEST_TIMEOUT_MS = 8000;
    static TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;

    static cachedAccessToken = null;
    static cachedAccessTokenExpiresAt = 0;

    constructor() {
        this.clientId = Config.get('SPOTIFY_CLIENT_ID');
        this.secretId = Config.get('SPOTIFY_SECRET_ID');
        this.refreshToken = Config.get('SPOTIFY_REFRESH_TOKEN');
    }

    getAuth() {
        return Buffer.from(`${this.clientId}:${this.secretId}`).toString('base64');
    }

    async makeRequest(url, headers = [], postData = null) {
        const options = {
            method: postData ? 'POST' : 'GET',
            headers: {}
        };

        headers.forEach(header => {
            const [key, value] = header.split(': ');
            options.headers[key] = value;
        });

        if (postData) {
            options.body = postData;
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SpotifyClient.REQUEST_TIMEOUT_MS);
        options.signal = controller.signal;

        try {
            const response = await fetch(url, options);
            const httpCode = response.status;
            let responseText = '';

            if (httpCode !== 204) responseText = await response.text();

            if (httpCode === 429) {
                const retryAfter = response.headers.get('Retry-After');
                throw new Error(`Rate limited by Spotify (429)${retryAfter ? `, retry after ${retryAfter}s` : ''}`);
            }

            if (httpCode >= 400) throw new Error(`HTTP Error ${httpCode}: ${responseText}`);

            return {
                response: responseText,
                httpCode
            };
        } catch (err) {
            if (err.name === 'AbortError') {
                throw new Error(`Request to ${url} timed out after ${SpotifyClient.REQUEST_TIMEOUT_MS}ms`);
            }

            console.error('Network error in makeRequest:', err.message);
            throw new Error('Failed to make request: ' + err.message);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * @returns {Promise<>}
     * @see https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
     */
    async refreshAccessToken() {
        const now = Date.now();

        if (SpotifyClient.cachedAccessToken && now < SpotifyClient.cachedAccessTokenExpiresAt) {
            return SpotifyClient.cachedAccessToken;
        }

        if (!this.refreshToken) {
            throw new SpotifyAuthError('SPOTIFY_REFRESH_TOKEN não está configurado');
        }

        const data = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken
        }).toString();

        const headers = [`Authorization: Basic ${this.getAuth()}`];

        let result;

        try {
            result = await this.makeRequest(SpotifyClient.REFRESH_TOKEN_URL, headers, data);
        } catch (err) {
            if (err.message.includes('invalid_grant')) {
                console.error('Refresh token expirado ou revogado. Gere um novo SPOTIFY_REFRESH_TOKEN.');
                throw new SpotifyAuthError('Refresh token expirado ou revogado — gere um novo e atualize a variável SPOTIFY_REFRESH_TOKEN');
            }

            console.error('Error refreshing token:', err.message);
            throw new Error('Unable to refresh token: ' + err.message);
        }

        let responseData;

        try {
            responseData = JSON.parse(result.response);
        } catch (err) {
            console.error('Invalid JSON in token response:', result.response);
            throw new Error('Invalid token response format');
        }

        if (!responseData.access_token) {
            console.error('Token refresh failed:', responseData);
            throw new Error('Failed to refresh token: ' + (responseData.error_description || JSON.stringify(responseData)));
        }

        SpotifyClient.cachedAccessToken = responseData.access_token;
        const expiresInMs = (responseData.expires_in || 3600) * 1000;
        SpotifyClient.cachedAccessTokenExpiresAt = now + expiresInMs - SpotifyClient.TOKEN_EXPIRY_BUFFER_MS;

        return responseData.access_token;
    }

    async safeRequest(label, fn) {
        try {
            return await fn();
        } catch (err) {
            if (err instanceof SpotifyAuthError) {
                console.error(`[SpotifyClient.${label}] Erro de autenticação:`, err.message);
            } else {
                console.error(`[SpotifyClient.${label}] Error:`, err.message);
            }

            return {};
        }
    }

    /**
     * @returns {Promise<>}
     * @see https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track
     */
    async getNowPlaying() {
        return this.safeRequest('getNowPlaying', async () => {
            const token = await this.refreshAccessToken();
            const headers = [`Authorization: Bearer ${token}`];
            const result = await this.makeRequest(SpotifyClient.NOW_PLAYING_URL, headers);

            if (result.httpCode === 204) return {};

            return JSON.parse(result.response);
        });
    }

    /**
     * @returns {Promise<>}
     * @see https://developer.spotify.com/documentation/web-api/reference/get-recently-played
     */
    async getRecentlyPlayed() {
        return this.safeRequest('getRecentlyPlayed', async () => {
            const token = await this.refreshAccessToken();
            const headers = [`Authorization: Bearer ${token}`];
            const result = await this.makeRequest(SpotifyClient.RECENTLY_PLAYED_URL, headers);

            if (result.httpCode === 204) return {};

            return JSON.parse(result.response);
        });
    }
}

module.exports = SpotifyClient;