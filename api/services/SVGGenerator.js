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
        let left = 1;

        for (let i = 1; i <= this.barCount; i++) {
            const anim = Math.floor(Math.random() * (1350 - 1000 + 1)) + 1000;
            barCSS += `.bar:nth-child(${i}) { left: ${left}px; animation-duration: ${anim}ms; }`;
            left += 4;
        }

        return barCSS;
    }

    async loadImageB64(url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
    }

    getTrackData(nowPlayingData, recentPlaysData = null) {
        if (!nowPlayingData || !nowPlayingData.item || nowPlayingData.item === 'None' || nowPlayingData.item === null) {
            const currentStatus = "Tocou recentemente";
            const recentPlaysLength = recentPlaysData.items.length;
            const itemIndex = Math.floor(Math.random() * recentPlaysLength);
            const item = recentPlaysData.items[itemIndex].track;

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

        let imageUrl = '';

        if (item.album && item.album.images && item.album.images.length > 0) imageUrl = item.album.images[1]?.url || item.album.images[0]?.url || '';

        return {
            song_name: item.name,
            artist_name: item.artists[0].name,
            album_name: item.album.name,
            song_url: item.external_urls.spotify,
            artist_url: item.artists[0].external_urls.spotify,
            album_url: item.album.external_urls.spotify,
            image_url: imageUrl,
            status: trackData.status,
            is_playing: !!(nowPlayingData && nowPlayingData.item),
            duration_ms: item.duration_ms,
            progress_ms: nowPlayingData?.progress_ms || 0
        };
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

        let image = '';

        if (item.album && item.album.images && item.album.images.length > 0) {
            const imageUrl = item.album.images[1]?.url || item.album.images[0]?.url;

            if (imageUrl) image = await this.loadImageB64(imageUrl);
        }

        const bars = this.generateBars();

        const data = {
            contentBar: bars.contentBar,
            barCSS: bars.barCSS,
            artistName: this.escapeHtml(item.artists[0].name),
            songName: this.escapeHtml(item.name),
            songURI: item.external_urls.spotify,
            artistURI: item.artists[0].external_urls.spotify,
            image: image,
            status: trackData.status,
            background_color: backgroundColor,
            border_color: borderColor
        };

        const templateName = this.templateManager.getCurrentTemplate();

        return this.templateManager.render(templateName, data);
    }
}

module.exports = SVGGenerator;