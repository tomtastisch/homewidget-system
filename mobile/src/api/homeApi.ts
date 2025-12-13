import {api} from './client';

export type BackendWidget = {
    id: number;
    name: string;
    config_json: string;
    owner_id?: number;
    created_at?: string;
};

export async function getHomeWidgets(init: RequestInit = {}): Promise<BackendWidget[]> {
    return api.get<BackendWidget[]>('/api/home/feed', init);
}
