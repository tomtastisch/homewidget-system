// Zentrale TestID-Registry für React Native Komponenten (mobile)
// Verwenden: `import {TID} from '../testing/testids'`

export const TID = {
	home: {
		screen: 'home.screen',
		header: {
			title: 'home.header.title',
		},
		role: {
			badge: 'home.role.badge',
		},
		loading: 'home.loading',
		empty: 'home.empty',
		widgets: {
			list: 'home.widgets.list',
		},
		loginLink: 'home.loginLink',
		demoBanner: 'home.demoBanner',
		mainContent: 'home.mainContent',
		mainContentSlot: (index: number) => `home.mainContent.slot.${index}`,
	},
} as const;

export type TestIds = typeof TID;
