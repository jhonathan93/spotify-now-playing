const Config = require('../config/Config');

class SpotifyClient {
    static REFRESH_TOKEN_URL = 'https://accounts.spotify.com/api/token';
    static NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
    static RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=10';

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

        try {
            const response = await fetch(url, options);
            const httpCode = response.status;
            let responseText = '';

            if (httpCode !== 204) responseText = await response.text();

            if (httpCode >= 400) throw new Error(`HTTP Error ${httpCode}: ${responseText}`);

            return {
                response: responseText,
                httpCode
            };
        } catch (err) {
            console.error('Network error in makeRequest:', err);
            throw new Error('Failed to make request: ' + err.message);
        }
    }

    /**
     * @returns {Promise<>}
     * @see https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
     */
    async refreshAccessToken() {
        const data = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken
        }).toString();

        const headers = [`Authorization: Basic ${this.getAuth()}`];

        let result;

        try {
            result = await this.makeRequest(SpotifyClient.REFRESH_TOKEN_URL, headers, data);
        } catch (err) {
            console.error('Error refreshing token:', err);
            throw new Error('Unable to refresh token');
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
            throw new Error('Failed to refresh token: ' + JSON.stringify(responseData));
        }

        return responseData.access_token;
    }

    async safeRequest(fn) {
        try {
            return await fn();
        } catch (err) {
            console.error(`[${fn.name}] Error:`, err);
            return {};
        }
    }

    /**
     * @returns {Promise<>}
     * @see https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track
     */
    async getNowPlaying() {
        return this.safeRequest(async () => {
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
        return this.safeRequest(async () => {
            const token = await this.refreshAccessToken();
            const headers = [`Authorization: Bearer ${token}`];
            const result = await this.makeRequest(SpotifyClient.RECENTLY_PLAYED_URL, headers);

            if (result.httpCode === 204) return {};

            return JSON.parse(result.response);
        });
    }
}

module.exports = SpotifyClient;