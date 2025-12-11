import {expect, Locator, Page} from '@playwright/test';

export async function expectSecureText(page: Page, locator: Locator, expectedText: string) {
	// Ensure textContent equals expected and innerHTML has no <script>
	await expect(locator).toHaveText(expectedText, {useInnerText: true});
	const inner = await locator.innerHTML();
	expect(inner.toLowerCase()).not.toContain('<script');
}

export async function injectXssPayload(page: Page, fieldName: string) {
	const payload = '<script>alert("XSS")</script>';
	const byLabel = page.getByLabel(fieldName);
	if (await byLabel.count()) {
		await byLabel.fill(payload);
		return payload;
	}
	const byPlaceholder = page.getByPlaceholder(fieldName);
	if (await byPlaceholder.count()) {
		await byPlaceholder.fill(payload);
		return payload;
	}
	// Fallback: query by name attribute
	const el = page.locator(`[name="${fieldName}"]`);
	await el.fill(payload);
	return payload;
}
