/**
 * Test-Utilities zur sicheren Manipulation von Umgebungsvariablen.
 * Kapselt Änderungen und stellt ursprüngliche Werte wieder her, um Paralleltests nicht zu beeinflussen.
 */

type Unsetter = () => void;

export function setHwProfile(profile: string | undefined | null): Unsetter {
	const prev = process.env.HW_PROFILE;
	if (profile === null || profile === undefined) {
		delete process.env.HW_PROFILE;
	} else {
		process.env.HW_PROFILE = String(profile);
	}
	return () => {
		if (prev === undefined) delete process.env.HW_PROFILE;
		else process.env.HW_PROFILE = prev;
	};
}

export async function withHwProfile<T>(profile: string, fn: () => Promise<T> | T): Promise<T> {
	const restore = setHwProfile(profile);
	try {
		return await fn();
	} finally {
		restore();
	}
}
