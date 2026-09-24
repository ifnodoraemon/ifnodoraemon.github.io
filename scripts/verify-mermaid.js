#!/usr/bin/env node
/**
 * Verify Mermaid Diagrams
 *
 * Scans all markdown files in content/{zh,en}/articles/*.md,
 * extracts every ```mermaid code block, and validates its syntax
 * using the official Mermaid AST parser.
 *
 * Exits with code 0 on success, code 1 on failure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DOMPurify from 'dompurify';
DOMPurify.addHook = () => {};
DOMPurify.sanitize = (s) => s;

import mermaid from 'mermaid';
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose'
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const contentDirs = [
  path.join(ROOT, 'content', 'zh', 'articles'),
  path.join(ROOT, 'content', 'en', 'articles')
];

let totalFiles = 0;
let totalDiagrams = 0;
const failures = [];

async function verifyAllMermaid() {
  console.log('🔍 Starting Automated Mermaid Syntax Verification...\n');

  for (const dir of contentDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      totalFiles++;
      const fullPath = path.join(dir, file);
      const relPath = path.relative(ROOT, fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      const lines = content.split('\n');
      let inMermaid = false;
      let startLine = 0;
      let blockLines = [];
      let diagramIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('```mermaid')) {
          inMermaid = true;
          startLine = i + 1;
          blockLines = [];
        } else if (inMermaid && line.trim() === '```') {
          inMermaid = false;
          diagramIndex++;
          totalDiagrams++;
          const code = blockLines.join('\n').trim();

          try {
            await mermaid.parse(code);
          } catch (err) {
            failures.push({
              file: relPath,
              line: startLine,
              diagramIndex,
              error: err.message || String(err),
              snippet: code.slice(0, 160) + (code.length > 160 ? '...' : '')
            });
          }
        } else if (inMermaid) {
          blockLines.push(line);
        }
      }
    }
  }

  console.log(`📊 Mermaid Audit Summary:`);
  console.log(`   Articles Scanned:  ${totalFiles}`);
  console.log(`   Diagrams Verified: ${totalDiagrams}`);
  console.log(`   Passed:            ${totalDiagrams - failures.length}`);
  console.log(`   Failed:            ${failures.length}\n`);

  if (failures.length > 0) {
    console.error('❌ Mermaid Syntax Verification FAILED:\n');
    failures.forEach((f, idx) => {
      console.error(`[${idx + 1}] File: ${f.file} (Line ${f.line}, Diagram #${f.diagramIndex})`);
      console.error(`    Error: ${f.error}`);
      console.error(`    Snippet:\n${f.snippet.split('\n').map(l => '      ' + l).join('\n')}\n`);
    });
    process.exit(1);
  }

  console.log('✅ All Mermaid diagrams passed syntax verification!\n');
}

verifyAllMermaid();
