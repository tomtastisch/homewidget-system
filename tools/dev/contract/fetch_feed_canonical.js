#!/usr/bin/env node
import fs from 'fs';

async function fetchFeed() {
    const baseUrl = process.env.E2E_API_BASE_URL || 'http://localhost:8000';
    const url = `${baseUrl}/api/home/demo/feed_v1`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Error fetching feed: ${response.status}`);
            process.exit(1);
        }
        const data = await response.json();
        
        // Kanonisierung:
        // 1. Keys sortieren
        // 2. Dynamische Felder (timestamps, IDs) normalisieren, falls nötig.
        // Im FeedItem gibt es wahrscheinlich IDs. Wir behalten sie, wenn sie deterministisch vom Backend kommen.
        
        const canonical = sortObject(data);
        fs.writeFileSync('feed_canonical_mobile.json', JSON.stringify(canonical, null, 2));
        console.log('Kanonischer Feed (Mobile) gespeichert.');
    } catch (error) {
        console.error('Fetch failed:', error);
        process.exit(1);
    }
}

function sortObject(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sortObject);
    }
    return Object.keys(obj).sort().reduce((acc, key) => {
        acc[key] = sortObject(obj[key]);
        return acc;
    }, {});
}

fetchFeed();
