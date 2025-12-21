import {getDemoWidgetDetail} from '../api/demoFeedV1';
import {api} from '../api/client';

jest.mock('../api/client');
const mockedApi = api as jest.Mocked<typeof api>;

describe('demoFeedV1 Strict Validation', () => {
	it('should return null for invalid detail payload (missing fields)', async () => {
		// Mock API response with missing 'container'
		mockedApi.get.mockResolvedValueOnce({
			id: 1001,
			content_spec: {
				kind: 'blocks',
				blocks: []
			}
		});

		const result = await getDemoWidgetDetail(1001);
		expect(result).toBeNull();
	});

	it('should return null for invalid detail payload (wrong type)', async () => {
		// Mock API response with wrong type for id
		mockedApi.get.mockResolvedValueOnce({
			id: "1001",
			container: { title: "Title", description: "Desc", image_url: null },
			content_spec: {
				kind: 'blocks',
				blocks: []
			}
		});

		const result = await getDemoWidgetDetail(1001);
		expect(result).toBeNull();
	});

	it('should return valid data for correct payload', async () => {
		const validData = {
			id: 1001,
			container: { title: "Title", description: "Desc", image_url: null },
			content_spec: {
				kind: 'blocks',
				blocks: []
			}
		};
		mockedApi.get.mockResolvedValueOnce(validData);

		const result = await getDemoWidgetDetail(1001);
		expect(result).toEqual(validData);
	});
});
