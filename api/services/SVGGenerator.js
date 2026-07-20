class SVGGenerator {
    constructor(spotifyClient, templateManager) {
        this.spotifyClient = spotifyClient;
        this.templateManager = templateManager;
        this.barCount = 84;
    }

    generateBars() {
        const contentBar = "<div class='bar'></div>".repeat(this.barCount);
        const barCSS = this.generateBarCSS();

        return { contentBar, barCSS };
    }

    generateBarCSS() {
        let barCSS = "";
        const step = 100 / this.barCount;

        for (let i = 1; i <= this.barCount; i++) {
            const anim = Math.floor(Math.random() * (1350 - 1000 + 1)) + 1000;
            const left = ((i - 1) * step).toFixed(2);
            barCSS += `.bar:nth-child(${i}) { left: ${left}%; animation-duration: ${anim}ms; }`;
        }

        return barCSS;
    }

    async loadImageB64(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch(url, { signal: controller.signal });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const buffer = await response.arrayBuffer();
            return Buffer.from(buffer).toString('base64');
        } catch (err) {
            console.error('Failed to load album image:', err.message);
            return '';
        } finally {
            clearTimeout(timeoutId);
        }
    }

    getImages(item) {
        return item.album?.images || item.images || item.show?.images || [];
    }

    getArtistName(item) {
        if (item.artists && item.artists.length > 0) return item.artists[0].name;
        if (item.show && item.show.name) return item.show.name;
        return 'Desconhecido';
    }

    getArtistUrl(item) {
        if (item.artists && item.artists.length > 0) return item.artists[0].external_urls?.spotify || '';
        if (item.show) return item.show.external_urls?.spotify || '';
        return '';
    }

    getAlbumName(item) {
        return item.album?.name || item.show?.name || '';
    }

    getAlbumUrl(item) {
        return item.album?.external_urls?.spotify || item.show?.external_urls?.spotify || '';
    }

    getTrackData(nowPlayingData, recentPlaysData = null) {
        if (!nowPlayingData || !nowPlayingData.item || nowPlayingData.item === 'None' || nowPlayingData.item === null) {
            const items = (recentPlaysData && Array.isArray(recentPlaysData.items)) ? recentPlaysData.items : [];

            if (items.length === 0) return { item: null, status: "Nenhuma música encontrada" };

            const currentStatus = "Tocou recentemente";
            const itemIndex = Math.floor(Math.random() * items.length);
            const item = items[itemIndex].track;

            return { item, status: currentStatus };
        } else {
            const item = nowPlayingData.item;
            const currentStatus = "Ouvindo agora";

            return { item, status: currentStatus };
        }
    }

    async getData() {
        const nowPlayingData = await this.spotifyClient.getNowPlaying();
        let recentPlaysData = null;

        if (!nowPlayingData || !nowPlayingData.item) recentPlaysData = await this.spotifyClient.getRecentlyPlayed();

        const trackData = this.getTrackData(nowPlayingData, recentPlaysData);
        const item = trackData.item;

        if (!item) {
            return {
                song_name: null,
                artist_name: null,
                album_name: null,
                song_url: null,
                artist_url: null,
                album_url: null,
                image_url: '',
                status: trackData.status,
                is_playing: false,
                duration_ms: 0,
                progress_ms: 0
            };
        }

        const images = this.getImages(item);
        const imageUrl = images.length > 0 ? (images[1]?.url || images[0]?.url || '') : '';

        return {
            song_name: item.name || null,
            artist_name: this.getArtistName(item),
            album_name: this.getAlbumName(item),
            song_url: item.external_urls?.spotify || null,
            artist_url: this.getArtistUrl(item),
            album_url: this.getAlbumUrl(item),
            image_url: imageUrl,
            status: trackData.status,
            is_playing: !!(nowPlayingData && nowPlayingData.item),
            duration_ms: item.duration_ms || 0,
            progress_ms: nowPlayingData?.progress_ms || 0
        };
    }

    formatTime(ms) {
        if (!ms || ms <= 0) return '0:00';

        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    adjustHexColor(hex, amount) {
        const clean = (hex || '181414').replace('#', '');
        const num = parseInt(clean, 16);

        if (isNaN(num)) return clean;

        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));

        return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return text.replace(/[&<>"']/g, m => map[m]);
    }

    async generate(backgroundColor = '181414', borderColor = '181414') {
        const nowPlayingData = await this.spotifyClient.getNowPlaying();
        let recentPlaysData = null;

        if (!nowPlayingData || !nowPlayingData.item) recentPlaysData = await this.spotifyClient.getRecentlyPlayed();

        const trackData = this.getTrackData(nowPlayingData, recentPlaysData);
        const item = trackData.item;

        const bars = this.generateBars();
        const backgroundColorEnd = this.adjustHexColor(backgroundColor, 14);

        if (!item) {
            const data = {
                contentBar: bars.contentBar,
                barCSS: bars.barCSS,
                artistName: '',
                songName: this.escapeHtml(trackData.status),
                songURI: '',
                artistURI: '',
                image: '',
                status: '',
                statusDotClass: 'dot-idle',
                statusPillDisplay: 'none',
                progressDisplay: 'none',
                progressPercent: 0,
                formattedProgress: '0:00',
                formattedDuration: '0:00',
                background_color: backgroundColor,
                background_color_end: backgroundColorEnd,
                border_color: borderColor
            };

            const templateName = this.templateManager.getCurrentTemplate();

            return this.templateManager.render(templateName, data);
        }

        let image = '';
        const images = this.getImages(item);
        const imageUrl = images.length > 0 ? (images[1]?.url || images[0]?.url) : null;

        if (imageUrl) image = await this.loadImageB64(imageUrl);

        const isCurrentlyPlaying = trackData.status === 'Ouvindo agora';
        const durationMs = item.duration_ms || 0;
        const progressMs = nowPlayingData?.progress_ms || 0;
        const progressPercent = (isCurrentlyPlaying && durationMs > 0)
            ? Math.min(100, Math.round((progressMs / durationMs) * 100))
            : 0;

        const data = {
            contentBar: bars.contentBar,
            barCSS: bars.barCSS,
            artistName: this.escapeHtml(this.getArtistName(item)),
            songName: this.escapeHtml(item.name || ''),
            songURI: item.external_urls?.spotify || '',
            artistURI: this.getArtistUrl(item),
            image: image,
            status: trackData.status,
            statusDotClass: isCurrentlyPlaying ? 'dot-live' : 'dot-idle',
            statusPillDisplay: 'inline-flex',
            progressDisplay: (isCurrentlyPlaying && durationMs > 0) ? 'flex' : 'none',
            progressPercent,
            formattedProgress: this.formatTime(progressMs),
            formattedDuration: this.formatTime(durationMs),
            background_color: backgroundColor,
            background_color_end: backgroundColorEnd,
            border_color: borderColor
        };

        const templateName = this.templateManager.getCurrentTemplate();

        return this.templateManager.render(templateName, data);
    }
}

module.exports = SVGGenerator;