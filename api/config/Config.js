const path = require('path');
const dotenv = require('dotenv');

class Config {
    static loaded = false;

    static load() {
        if (this.loaded) return;

        if (process.env.NODE_ENV !== 'production') {
            const envPath = path.resolve(process.cwd(), '.env');
            const result = dotenv.config({ path: envPath });

            if (result.error) throw new Error(`Erro: Não foi possível carregar o arquivo .env em ${envPath}`);
        }

        this.loaded = true;
    }

    static get(key, defaultValue = null) {
        this.load();

        return process.env[key] || defaultValue;
    }

    static validate() {
        const clientId = this.get('SPOTIFY_CLIENT_ID');
        const secretId = this.get('SPOTIFY_SECRET_ID');
        const refreshToken = this.get('SPOTIFY_REFRESH_TOKEN');

        if (!clientId || !secretId || !refreshToken) {
            const error = `
            Erro: Variáveis de ambiente não carregadas corretamente.
                SPOTIFY_CLIENT_ID: ${clientId ? 'OK' : 'VAZIO'}
                SPOTIFY_SECRET_ID: ${secretId ? 'OK' : 'VAZIO'}
                SPOTIFY_REFRESH_TOKEN: ${refreshToken ? 'OK' : 'VAZIO'}
            `;

            throw new Error(error);
        }
    }
}

module.exports = Config;
