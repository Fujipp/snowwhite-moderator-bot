const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '..', 'data', 'config.json');

class ConfigManager {
  constructor() {
    this.config = this.load();
  }

  load() {
    try {
      if (!fs.existsSync(configPath)) {
        return {};
      }
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading config:', error);
      return {};
    }
  }

  save() {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    }
  }

  get(key) {
    if (!key) return this.config;
    return key.split('.').reduce((acc, cur) => (acc && acc[cur] !== undefined ? acc[cur] : undefined), this.config);
  }

  set(key, value) {
    const keys = key.split('.');
    let current = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    return this.save();
  }
}

module.exports = new ConfigManager();
