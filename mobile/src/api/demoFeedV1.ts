import {api} from './client';
import {createLogger} from '../logging/logger';
import type {FeedPageV1 as FeedPageV1Type, WidgetDetailV1 as WidgetDetailV1Type} from '../homewidget/contracts/v1/schemas';
import {FeedPageV1, WidgetDetailV1} from '../homewidget/contracts/v1/schemas';

const LOG = createLogger('mobile.api.demo');

// Re-export types for consumers without pulling in schema values
export type {FeedPageV1 as FeedPageV1, WidgetDetailV1 as WidgetDetailV1} from '../homewidget/contracts/v1/schemas';

const EMPTY_FEED_PAGE: FeedPageV1Type = {items: [], next_cursor: null};

export async function getDemoFeedPage(params: {
	cursor?: number | null;
	limit?: number
} = {}): Promise<FeedPageV1Type> {
	const search = new URLSearchParams();
	if (params.cursor != null) search.set('cursor', String(params.cursor));
	if (params.limit != null) search.set('limit', String(params.limit));
	const qs = search.toString();
	
	try {
		const data = await api.get<unknown>(`/api/home/demo/feed_v1${qs ? `?${qs}` : ''}`);
		const parsed = FeedPageV1.safeParse(data);
		if (!parsed.success) {
			LOG.warn('feed_v1_invalid_payload', {issues: parsed.error.issues});
			return EMPTY_FEED_PAGE;
		}
		return parsed.data;
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		LOG.warn('feed_v1_request_failed', {message});
		return EMPTY_FEED_PAGE;
	}
}

export async function getDemoWidgetDetail(id: number): Promise<WidgetDetailV1Type | null> {
	if (!id || id <= 0) return null;
	try {
		const data = await api.get<unknown>(`/api/home/demo/widgets/${id}/detail_v1`);
		const parsed = WidgetDetailV1.safeParse(data);
		if (!parsed.success) {
			LOG.warn('detail_v1_invalid_payload', {id, issues: parsed.error.issues});
			return null;
		}
		return parsed.data;
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		LOG.warn('detail_v1_request_failed', {id, message});
		return null;
	}
}
