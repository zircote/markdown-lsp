#!/usr/bin/env node
/**
 * Validates markdown links for broken references and proper formatting.
 * Checks internal anchor links and relative file links.
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: validate-links.js <file>');
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const diagnostics = [];

// Extract all headings to validate anchor links
const headings = new Set();
const headingRegex = /^#{1,6}\s+(.+)$/;

for (const line of lines) {
  const match = line.match(headingRegex);
  if (match) {
    // Convert heading to anchor format (lowercase, spaces to hyphens, remove special chars)
    const anchor = match[1]
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    headings.add(anchor);
  }
}

// Validate links
const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
const baseDir = path.dirname(path.resolve(filePath));

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  let match;

  while ((match = linkRegex.exec(line)) !== null) {
    const linkTarget = match[2];
    const column = match.index + 1;

    // Skip external links
    if (linkTarget.startsWith('http://') || linkTarget.startsWith('https://')) {
      continue;
    }

    // Check anchor links
    if (linkTarget.startsWith('#')) {
      const anchor = linkTarget.slice(1);
      if (!headings.has(anchor)) {
        diagnostics.push({
          line: lineNum,
          column: column,
          severity: 'warning',
          message: `Broken anchor link: ${linkTarget}`,
          source: 'validate-links'
        });
      }
      continue;
    }

    // Check relative file links
    const [filePart] = linkTarget.split('#');
    if (filePart) {
      const targetPath = path.resolve(baseDir, filePart);
      if (!fs.existsSync(targetPath)) {
        diagnostics.push({
          line: lineNum,
          column: column,
          severity: 'warning',
          message: `Broken file link: ${filePart}`,
          source: 'validate-links'
        });
      }
    }
  }

  // Reset regex lastIndex for next line
  linkRegex.lastIndex = 0;
}

console.log(JSON.stringify({ diagnostics }));
