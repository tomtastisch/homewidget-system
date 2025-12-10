import {parseBackendWidget, safeParseConfig} from '../../types/widgets';

describe('widgets parsing helpers', () => {
	it('safeParseConfig parses valid JSON and preserves type/title', () => {
		const cfg = safeParseConfig(JSON.stringify({type: 'banner', title: 'Hello'}));
		expect(cfg.type).toBe('banner');
		expect(cfg.title).toBe('Hello');
	});
	
	it('safeParseConfig returns fallback when JSON invalid', () => {
		// @ts-expect-error intentionally wrong type to simulate broken json
		const cfg = safeParseConfig('not-a-json');
		expect(cfg.type).toBe('card');
		expect(cfg.title).toBe('Ungültige Konfiguration');
	});
	
	it('parseBackendWidget attaches parsed config', () => {
		const w = {id: 1, name: 'X', config_json: JSON.stringify({type: 'card', title: 'T'})};
		const parsed = parseBackendWidget(w as any);
		expect(parsed.id).toBe(1);
		expect(parsed.config.type).toBe('card');
		expect(parsed.config.title).toBe('T');
	});
});
