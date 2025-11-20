#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SHEET = path.join(__dirname, '..', 'SIGN_IN_SHEET.md');
const content = fs.readFileSync(SHEET, 'utf8');

const completed = content.match(/^\| \d+.*completed sessions/gim) || [];
const stars = content.match(/⭐/g) || [];
const avgStars = stars.length / (completed.length || 1);

console.log('\n📊 Monthly Lessons Report\n');
console.log(`Sessions: ${completed.length}`);
console.log(`Avg Effectiveness: ${avgStars.toFixed(1)}/5.0`);
console.log(`Total ⭐: ${stars.length}\n`);
