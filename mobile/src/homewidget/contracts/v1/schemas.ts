import {z} from 'zod';

export const WidgetContractV1 = z.object({
	id: z.number(),
	name: z.string(),
	priority: z.number().optional(),
	created_at: z.string().optional(),
});

export const FeedPageV1 = z.object({
	items: z.array(WidgetContractV1),
	next_cursor: z.number().nullable().optional(),
});

export type WidgetContractV1 = z.infer<typeof WidgetContractV1>;
export type FeedPageV1 = z.infer<typeof FeedPageV1>;

export const ContentBlockV1 = z.object({
	type: z.string(),
	props: z.record(z.string(), z.unknown()).default({}),
});

export const ContentSpecV1 = z.object({
	kind: z.literal('blocks'),
	blocks: z.array(ContentBlockV1),
});

export const WidgetDetailV1 = z.object({
	id: z.number(),
	container: z.object({
		title: z.string(),
		description: z.string(),
		image_url: z.string().url().nullable().optional(),
	}).passthrough(),
	content_spec: ContentSpecV1,
});

export type ContentBlockV1 = z.infer<typeof ContentBlockV1>;
export type ContentSpecV1 = z.infer<typeof ContentSpecV1>;
export type WidgetDetailV1 = z.infer<typeof WidgetDetailV1>;
