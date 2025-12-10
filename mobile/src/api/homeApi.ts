import {api} from './client';

// Types aligned with backend WidgetRead schema
export type BackendWidget = {
	id: number;
	name: string;
	config_json: string;
	owner_id?: number;
	created_at?: string;
	// Future fields like slot/priority may be added by backend; UI must not rely on them here
};

/**
 * Fetch home widgets from backend.
 * - If the ApiClient has an access token configured, backend returns a personalized feed.
 * - Without token, backend (PoC) may return demo widgets or an auth error depending on implementation.
 * The UI accepts backend ordering; no client-side sorting.
 */
export async function getHomeWidgets(): Promise<BackendWidget[]> {
	return api.get<BackendWidget[]>(`/api/home/feed`);
}
