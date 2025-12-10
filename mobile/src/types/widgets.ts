// Widget types and parsing helpers aligned with backend schema
import type {BackendWidget} from '../api/homeApi';

export type WidgetType = 'card' | 'banner' | 'teaser';

export type WidgetConfigBase = {
	type: WidgetType;
	title?: string;
	description?: string;
	image_url?: string;
	cta_label?: string;
	cta_target?: string;
};

export type CardWidgetConfig = WidgetConfigBase & { type: 'card' };
export type BannerWidgetConfig = WidgetConfigBase & { type: 'banner' };
export type TeaserWidgetConfig = WidgetConfigBase & { type: 'teaser' };

export type AnyWidgetConfig = CardWidgetConfig | BannerWidgetConfig | TeaserWidgetConfig | WidgetConfigBase;

export type ParsedWidget = BackendWidget & {
	config: AnyWidgetConfig;
};

export function safeParseConfig(config_json: string): AnyWidgetConfig {
	try {
		const parsed = JSON.parse(config_json || '{}');
		const type = (parsed?.type || 'card') as WidgetType;
		return {type, ...parsed} as AnyWidgetConfig;
	} catch (_e) {
		return {type: 'card', title: 'Ungültige Konfiguration'};
	}
}

export function parseBackendWidget(w: BackendWidget): ParsedWidget {
	return {...w, config: safeParseConfig(w.config_json)};
}
