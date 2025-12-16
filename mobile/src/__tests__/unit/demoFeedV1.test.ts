import {api} from '../../api/client';
import {getDemoFeedPage, getDemoWidgetDetail} from '../../api/demoFeedV1';

describe('demoFeedV1 API', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});
	
	describe('getDemoFeedPage', () => {
		const validFeed = {
			items: [
				{id: 1, name: 'Widget A', priority: 5, created_at: '2024-01-01T00:00:00Z'},
				{id: 2, name: 'Widget B'},
			],
			next_cursor: 123,
		};
		
		it('liefert geparstes Ergebnis bei gültigem Payload (Happy Path)', async () => {
			jest.spyOn(api, 'get').mockResolvedValueOnce(validFeed);
			
			const res = await getDemoFeedPage();
			
			expect(api.get).toHaveBeenCalledWith('/api/home/demo/feed_v1');
			expect(res).toEqual(validFeed);
		});
		
		it('fällt auf leere Feed-Seite zurück, wenn Zod-Validierung fehlschlägt (ungültiges Payload)', async () => {
			const invalidFeed: any = {items: [{id: 'not-a-number', name: 'X'}], next_cursor: 'abc'};
			jest.spyOn(api, 'get').mockResolvedValueOnce(invalidFeed);
			
			const res = await getDemoFeedPage();
			
			// Fallback erwartet
			expect(res).toEqual({items: [], next_cursor: null});
		});
		
		it('fällt auf leere Feed-Seite zurück, wenn Request fehlschlägt', async () => {
			jest.spyOn(api, 'get').mockRejectedValueOnce(new Error('network down'));
			
			const res = await getDemoFeedPage();
			
			expect(res).toEqual({items: [], next_cursor: null});
		});
	});
	
	describe('getDemoWidgetDetail', () => {
		const validDetail = {
			id: 42,
			container: {
				title: 'Details',
				description: 'Lorem ipsum',
				image_url: null,
			},
			content_spec: {
				kind: 'blocks',
				blocks: [
					{type: 'text', props: {text: 'Hello'}},
				],
			},
		};
		
		it('liefert geparstes Detail bei gültigem Payload (Happy Path)', async () => {
			jest.spyOn(api, 'get').mockResolvedValueOnce(validDetail);
			
			const res = await getDemoWidgetDetail(42);
			
			expect(api.get).toHaveBeenCalledWith('/api/home/demo/widgets/42/detail_v1');
			expect(res).toEqual(validDetail);
		});
		
		it('gibt null zurück, wenn Zod-Validierung fehlschlägt (ungültiges Payload)', async () => {
			const invalidDetail: any = {id: 42, container: {title: 'X'}, content_spec: {kind: 'blocks'}}; // fehlt description & blocks-Array
			jest.spyOn(api, 'get').mockResolvedValueOnce(invalidDetail);
			
			const res = await getDemoWidgetDetail(42);
			
			expect(res).toBeNull();
		});
		
		it('gibt null zurück, wenn Request fehlschlägt', async () => {
			jest.spyOn(api, 'get').mockRejectedValueOnce(new Error('timeout'));
			
			const res = await getDemoWidgetDetail(99);
			
			expect(res).toBeNull();
		});
		
		it('gibt null bei ungültiger ID (<= 0) zurück, ohne Request auszuführen', async () => {
			const spy = jest.spyOn(api, 'get');
			
			const res = await getDemoWidgetDetail(0 as number);
			
			expect(res).toBeNull();
			expect(spy).not.toHaveBeenCalled();
		});
	});
});
