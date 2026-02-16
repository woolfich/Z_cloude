// Time norm for one unit of an article
export interface Rate {
	id: string;          // uuid
	article: string;     // e.g. "XT44" — always UPPERCASE, alphanumeric, no spaces
	norm: number;        // hours per 1 unit (h)
}

// A planned production target
export interface PlanItem {
	id: string;
	article: string;     // must exist in Rates
	target: number;      // quantity to complete (pcs)
	completed: number;   // sum of all welders' entries for this article
	locked: boolean;     // true when completed >= target
}

// A single work entry in a welder's card
export interface WCEntry {
	id: string;
	article: string;     // must exist in PlanItems
	quantity: number;    // pcs
	date: string;        // ISO date string "YYYY-MM-DD"
	updatedAt: number;   // timestamp for sorting (most recently modified first)
}

// A welder
export interface Welder {
	id: string;
	lastName: string;
	entries: WCEntry[];
	overtime: Record<string, number>; // key: "YYYY-MM-DD", value: hours
	manualOvertimeOverrides: Record<string, boolean>; // key: "YYYY-MM-DD", value: true if manually overridden
}

// App state for import/export
export interface AppState {
	welders: Welder[];
	rates: Rate[];
	planItems: PlanItem[];
	exportDate: string;
	version: string;
}

// For the suggestion dropdown
export interface SuggestionItem {
	article: string;
	displayText: string;
}

// For the info panel in WC screen
export interface WelderProgress {
	lastName: string;
	quantity: number;
}

// Modal types
export type ModalType = 'edit' | 'delete' | 'info' | 'none';
