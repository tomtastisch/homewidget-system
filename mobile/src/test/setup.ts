import {afterAll} from '@jest/globals';
import {__resetQueryClientForTests} from '../query/queryClient';

// Globales Cleanup: QueryClient-Singleton nach allen Tests zurücksetzen und aufräumen
afterAll(() => {
	__resetQueryClientForTests();
});
