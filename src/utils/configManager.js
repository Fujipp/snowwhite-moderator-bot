const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');

class ConfigManager {
  constructor() {
    this.config = this.load();
  }

  load() {
    try {
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
    return this.getNestedValue(this.config, key.split('.'));
  }

  set(key, value) {
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    return this.save();
  }

  getAll() {
    return this.config;
  }

  getNestedValue(obj, keys) {
    let current = obj;
    for (const key of keys) {
      if (current[key] !== undefined) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  }
}

module.exports = new ConfigManager();
