const fs = require('fs');
const path = require('path');

class TemplateManager {
    static FALLBACK_THEME = 'spotify.html';

    constructor(templatesPath = null) {
        this.templatesPath = templatesPath || path.join(__dirname, '../templates');
    }

    getCurrentTemplate() {
        try {
            const file = fs.readFileSync(path.join(this.templatesPath, 'templates.json'), 'utf-8');
            const templates = JSON.parse(file);

            return templates.templates[templates['current-theme']];
        } catch (e) {
            return TemplateManager.FALLBACK_THEME;
        }
    }

    loadTemplate(templateName) {
        const templatePath = path.join(this.templatesPath, templateName);
        if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${templateName}`);

        return fs.readFileSync(templatePath, 'utf-8');
    }

    render(templateName, data) {
        try {
            let template = this.loadTemplate(templateName);

            for (const [key, value] of Object.entries(data)) {
                const regex1 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                const regex2 = new RegExp(`\\{\\{ ${key} \\}\\}`, 'g');

                template = template.replace(regex1, value);
                template = template.replace(regex2, value);
            }

            if (data.barCSS) {
                template = template.replace(/\{\{barCSS\|safe\}\}/g, data.barCSS);
                template = template.replace(/\{\{ barCSS\|safe \}\}/g, data.barCSS);
            }

            if (data.contentBar) {
                template = template.replace(/\{\{contentBar\|safe\}\}/g, data.contentBar);
                template = template.replace(/\{\{ contentBar\|safe \}\}/g, data.contentBar);
            }

            return template;
        } catch (e) {
            console.error('Error rendering template:', e);
            return null;
        }
    }
}

module.exports = TemplateManager;