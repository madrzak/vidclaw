#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { SourceMapConsumer } from 'source-map-js';

function usage() {
  console.log('Usage: node scripts/map-stack.mjs <bundle.js> <bundle.js.map> <line> <column>');
  process.exit(1);
}

const [bundlePath, mapPath, lineStr, columnStr] = process.argv.slice(2);
if (!bundlePath || !mapPath || !lineStr || !columnStr) usage();

const line = Number(lineStr);
const column = Number(columnStr);
if (!Number.isInteger(line) || !Number.isInteger(column)) usage();

if (!fs.existsSync(bundlePath)) {
  console.error(`Bundle not found: ${bundlePath}`);
  process.exit(2);
}
if (!fs.existsSync(mapPath)) {
  console.error(`Map not found: ${mapPath}`);
  process.exit(2);
}

const rawMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const consumer = await new SourceMapConsumer(rawMap);
const pos = consumer.originalPositionFor({ line, column });

console.log('Generated position:', { file: path.basename(bundlePath), line, column });
console.log('Original position:', pos);

if (pos.source) {
  const content = consumer.sourceContentFor(pos.source, true);
  if (content) {
    const lines = content.split('\n');
    const srcLine = lines[pos.line - 1] ?? '';
    const start = Math.max(0, pos.column - 80);
    const end = Math.min(srcLine.length, pos.column + 120);

    console.log('\nSource excerpt:');
    console.log(srcLine.slice(start, end));
    console.log(' '.repeat(Math.max(0, pos.column - start)) + '^');
  }
}
