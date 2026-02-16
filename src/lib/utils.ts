import { v4 as uuidv4 } from 'uuid';
import type { Rate, PlanItem, Welder, WCEntry } from './types';

/**
 * Normalizes article input: strips spaces, converts to uppercase
 * Examples: "xt 44" -> "XT44", "  Xt44  " -> "XT44", "xt 4 4" -> "XT44"
 */
export function normalizeArticle(input: string): string {
	// Remove all spaces and convert to uppercase
	return input.replace(/\s+/g, '').toUpperCase();
}

/**
 * Formats a number to always show exactly 2 decimal places
 * Example: 1.3 -> "1.30", 0.4 -> "0.40", 10 -> "10.00"
 */
export function formatQty(n: number): string {
	return n.toFixed(2);
}

/**
 * Formats a number with Russian locale (comma as decimal separator for display)
 */
export function formatQtyRu(n: number): string {
	return n.toFixed(2).replace('.', ',');
}

/**
 * Generates a new UUID
 */
export function generateId(): string {
	return uuidv4();
}

/**
 * Gets today's date as ISO string "YYYY-MM-DD"
 */
export function getTodayISO(): string {
	return new Date().toISOString().split('T')[0];
}

/**
 * Calculates overtime for a specific date based on entries and rates
 * Overtime = max(0, totalHours - 8)
 */
export function calcOvertime(
	entries: WCEntry[],
	rates: Rate[],
	date: string
): number {
	// Filter entries for the specific date
	const dayEntries = entries.filter((e) => e.date === date);
	
	// Sum up total hours for the day
	let totalHours = 0;
	for (const entry of dayEntries) {
		const rate = rates.find((r) => r.article === entry.article);
		if (rate) {
			totalHours += rate.norm * entry.quantity;
		}
	}
	
	// Overtime is anything over 8 hours
	return Math.max(0, totalHours - 8);
}

/**
 * Calculates total hours for entries on a specific date
 */
export function calcTotalHours(
	entries: WCEntry[],
	rates: Rate[],
	date: string
): number {
	const dayEntries = entries.filter((e) => e.date === date);
	let totalHours = 0;
	for (const entry of dayEntries) {
		const rate = rates.find((r) => r.article === entry.article);
		if (rate) {
			totalHours += rate.norm * entry.quantity;
		}
	}
	return totalHours;
}

/**
 * Recalculates plan item completed values based on all welders' entries
 */
export function recalcPlanCompleted(
	planItems: PlanItem[],
	allWelders: Welder[]
): PlanItem[] {
	return planItems.map((item) => {
		// Sum all quantities for this article across all welders
		let totalCompleted = 0;
		for (const welder of allWelders) {
			for (const entry of welder.entries) {
				if (entry.article === item.article) {
					totalCompleted += entry.quantity;
				}
			}
		}
		
		// Update locked status
		const locked = totalCompleted >= item.target;
		
		return {
			...item,
			completed: totalCompleted,
			locked
		};
	});
}

/**
 * Capitalizes the first letter of a string (for welder last names)
 */
export function capitalizeFirst(str: string): string {
	const trimmed = str.trim();
	if (trimmed.length === 0) return trimmed;
	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Gets today's entries summary for a welder
 * Returns formatted string like "XT66 1.30 pcs; XT22 0.40 pcs"
 */
export function getTodaySummary(welder: Welder, today: string): string {
	const todayEntries = welder.entries.filter((e) => e.date === today);
	
	if (todayEntries.length === 0) {
		return '';
	}
	
	// Sum quantities by article
	const articleTotals: Record<string, number> = {};
	for (const entry of todayEntries) {
		if (articleTotals[entry.article]) {
			articleTotals[entry.article] += entry.quantity;
		} else {
			articleTotals[entry.article] = entry.quantity;
		}
	}
	
	// Format the summary
	const parts: string[] = [];
	for (const article of Object.keys(articleTotals).sort()) {
		parts.push(`${article} ${formatQty(articleTotals[article])} шт`);
	}
	
	return parts.join('; ');
}

/**
 * Gets all-time entries summary for a welder
 * Returns formatted string like "XT44 6.00 шт; XT55 3.00 шт"
 */
export function getAllTimeSummary(welder: Welder): string {
	if (welder.entries.length === 0) {
		return '';
	}
	
	// Sum quantities by article
	const articleTotals: Record<string, number> = {};
	for (const entry of welder.entries) {
		if (articleTotals[entry.article]) {
			articleTotals[entry.article] += entry.quantity;
		} else {
			articleTotals[entry.article] = entry.quantity;
		}
	}
	
	// Format the summary
	const parts: string[] = [];
	for (const article of Object.keys(articleTotals).sort()) {
		parts.push(`${article} ${formatQty(articleTotals[article])} шт`);
	}
	
	return parts.join('; ');
}

/**
 * Gets progress by welder for a specific article
 */
export function getWelderProgressByArticle(
	article: string,
	allWelders: Welder[]
): { lastName: string; quantity: number }[] {
	const progress: { lastName: string; quantity: number }[] = [];
	
	for (const welder of allWelders) {
		let totalQty = 0;
		for (const entry of welder.entries) {
			if (entry.article === article) {
				totalQty += entry.quantity;
			}
		}
		if (totalQty > 0) {
			progress.push({
				lastName: welder.lastName,
				quantity: totalQty
			});
		}
	}
	
	return progress.sort((a, b) => a.lastName.localeCompare(b.lastName, 'ru'));
}

/**
 * Formats date for display in Russian
 */
export function formatDateRu(dateStr: string): string {
	const date = new Date(dateStr);
	const options: Intl.DateTimeFormatOptions = {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	};
	return date.toLocaleDateString('ru-RU', options);
}

/**
 * Gets dates with overtime for a welder, sorted by date descending
 */
export function getOvertimeDates(welder: Welder): string[] {
	return Object.keys(welder.overtime)
		.filter((date) => welder.overtime[date] > 0)
		.sort((a, b) => b.localeCompare(a));
}

/**
 * Validates that a string is a valid article format (alphanumeric only after normalization)
 */
export function isValidArticle(article: string): boolean {
	const normalized = normalizeArticle(article);
	return normalized.length > 0 && /^[A-Z0-9]+$/.test(normalized);
}

/**
 * Debounce helper for input handling
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;
	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}
