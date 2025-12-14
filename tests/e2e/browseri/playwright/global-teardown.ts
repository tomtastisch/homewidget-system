/**
 * Global Teardown für Playwright
 *
 * Stelle sicher, dass alle Prozesse (insbesondere Expo-Web auf Port 19006)
 * nach den Tests sauber beendet werden.
 */
import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

async function globalTeardown() {
	console.log('🧹 Cleanup: Beende Prozesse auf Port 19006 (Expo-Web)...');
	
	try {
		// Versuche, den Prozess auf Port 19006 zu beenden (macOS/Linux)
		await execAsync('lsof -ti:19006 | xargs kill -9 2>/dev/null || true');
		console.log('✓ Port 19006 freigegeben');
	} catch (e) {
		// Ignoriere Fehler beim Kill
		console.log('ℹ️  Port 19006 ist bereits frei oder Prozess konnte nicht beendet werden');
	}
	
	console.log('✓ Cleanup abgeschlossen');
}

export default globalTeardown;

