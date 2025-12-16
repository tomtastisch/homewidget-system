#!/usr/bin/env node
/* eslint-env node */
import {access, copyFile, mkdir} from 'node:fs/promises';
import {constants as fsConstants} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import process, {stderr, stdout} from 'node:process';

async function main() {
    const here = dirname(fileURLToPath(import.meta.url)); // .../mobile/tools
    const mobileDir = resolve(here, '..'); // .../mobile
    const repoRoot = resolve(mobileDir, '..'); // repo root
    const src = resolve(repoRoot, 'config', 'timing.public.json');
    const dest = resolve(mobileDir, 'src', 'config', '_generated.timing.public.json');

    // ensure src exists
    try {
        await access(src, fsConstants.R_OK);
    } catch {
        stderr.write(`[copy_timing_public] Quelle nicht gefunden: ${src}\n`);
        process.exitCode = 1;
        return;
    }

    await mkdir(dirname(dest), {recursive: true});
    await copyFile(src, dest);
    stdout.write(`[copy_timing_public] Kopiert: ${src} -> ${dest}\n`);
}

main().catch((err) => {
    stderr.write(`[copy_timing_public] Fehler: ${String(err && err.stack || err)}\n`);
    process.exitCode = 1;
});
