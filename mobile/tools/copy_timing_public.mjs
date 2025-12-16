#!/usr/bin/env node
import {access, copyFile, mkdir} from 'node:fs/promises';
import {constants as fsConstants} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

async function main() {
    const here = dirname(fileURLToPath(import.meta.url)); // .../mobile/tools
    const mobileDir = resolve(here, '..'); // .../mobile
    const repoRoot = resolve(mobileDir, '..'); // repo root
    const src = resolve(repoRoot, 'config', 'timing.public.json');
    const dest = resolve(mobileDir, 'src', 'config', '_generated.timing.public.json');

    // ensure src exists
    try {
        await access(src, fsConstants.R_OK);
    } catch (err) {
        console.error(`[copy_timing_public] Quelle nicht gefunden: ${src}`);
        process.exitCode = 1;
        return;
    }

    await mkdir(dirname(dest), {recursive: true});
    await copyFile(src, dest);
    console.log(`[copy_timing_public] Kopiert: ${src} -> ${dest}`);
}

main().catch((err) => {
    console.error('[copy_timing_public] Fehler:', err);
    process.exitCode = 1;
});
