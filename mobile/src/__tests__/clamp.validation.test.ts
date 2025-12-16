import {describe, expect, test} from '@jest/globals';
import {clamp} from '../config/timingLimits';

describe('clamp validation', () => {
	test('returns min when value is NaN/undefined', () => {
		// @ts-expect-error intentional invalid
		expect(clamp(undefined, 10, 20)).toBe(10);
		expect(clamp(NaN as any, 5, 7)).toBe(5);
	});
	
	test('swaps bounds if min > max', () => {
		expect(clamp(5, 10, 0)).toBe(5);
		expect(clamp(100, 10, -10)).toBe(10);
	});
	
	test('repairs invalid bounds to sensible defaults', () => {
		expect(clamp(5, NaN, 3)).toBe(3);
		expect(clamp(5, 0, NaN)).toBe(5);
	});
});
