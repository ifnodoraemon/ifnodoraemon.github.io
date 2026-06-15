const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Reverse timeline array so it goes from newest to oldest
zh.models.timeline = zh.models.timeline.sort((a, b) => b.date.localeCompare(a.date));
en.models.timeline = en.models.timeline.sort((a, b) => b.date.localeCompare(a.date));

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');

console.log('Timelines sorted in descending order (newest to oldest)');
