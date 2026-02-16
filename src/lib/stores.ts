import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { Rate, PlanItem, Welder, AppState } from './types';
import { recalcPlanCompleted, getTodayISO } from './utils';

/**
 * Migrates welder data to ensure all required fields exist
 * This handles backwards compatibility with older data
 */
function migrateWelderData(welders: Welder[]): Welder[] {
        return welders.map((w) => ({
                ...w,
                // Ensure manualOvertimeOverrides exists (added in later version)
                manualOvertimeOverrides: w.manualOvertimeOverrides || {},
                // Ensure overtime exists
                overtime: w.overtime || {}
        }));
}

/**
 * Creates a Svelte store that persists to localStorage
 */
function createPersistedStore<T>(key: string, initialValue: T, migrator?: (value: T) => T) {
        // Create the underlying writable store
        const { subscribe, set, update } = writable<T>(initialValue);

        // Load from localStorage on initialization (browser only)
        if (browser) {
                const stored = localStorage.getItem(key);
                if (stored) {
                        try {
                                let parsed = JSON.parse(stored) as T;
                                // Apply migration if provided
                                if (migrator) {
                                        parsed = migrator(parsed);
                                }
                                set(parsed);
                        } catch (e) {
                                console.error(`Failed to parse ${key} from localStorage:`, e);
                        }
                }
        }

        // Custom set function that also saves to localStorage
        const persistSet = (value: T) => {
                set(value);
                if (browser) {
                        localStorage.setItem(key, JSON.stringify(value));
                }
        };

        // Custom update function that also saves to localStorage
        const persistUpdate = (updater: (value: T) => T) => {
                update((value) => {
                        const newValue = updater(value);
                        if (browser) {
                                localStorage.setItem(key, JSON.stringify(newValue));
                        }
                        return newValue;
                });
        };

        return {
                subscribe,
                set: persistSet,
                update: persistUpdate
        };
}

// =====================================================
// MAIN STORES
// =====================================================

/**
 * Store for rates (article norms)
 */
export const rates = createPersistedStore<Rate[]>('weldtrack-rates', []);

/**
 * Store for plan items (production targets)
 */
export const planItems = createPersistedStore<PlanItem[]>('weldtrack-plan', []);

/**
 * Store for welders and their entries
 */
export const welders = createPersistedStore<Welder[]>('weldtrack-welders', [], migrateWelderData);

// =====================================================
// DERIVED STORES
// =====================================================

/**
 * Derived store that recalculates plan completed values
 * whenever welders or planItems change
 */
export const calculatedPlanItems = derived(
        [welders, planItems],
        ([$welders, $planItems]) => {
                return recalcPlanCompleted($planItems, $welders);
        }
);

/**
 * Derived store for unlocked plan items (for suggestions in WC)
 */
export const unlockedPlanItems = derived(
        [calculatedPlanItems],
        ([$calculatedPlanItems]) => {
                return $calculatedPlanItems.filter((item) => !item.locked);
        }
);

/**
 * Derived store for articles that have rates (for suggestions)
 */
export const articlesWithRates = derived([rates], ([$rates]) => {
        return $rates.map((r) => r.article).sort();
});

/**
 * Derived store for articles that have plan items (for WC suggestions)
 */
export const articlesWithPlan = derived([calculatedPlanItems], ([$calculatedPlanItems]) => {
        return $calculatedPlanItems.map((p) => p.article).sort();
});

// =====================================================
// STORE ACTIONS
// =====================================================

/**
 * Adds a new rate
 */
export function addRate(article: string, norm: number): boolean {
        const normalizedArticle = article.toUpperCase().replace(/\s+/g, '');
        
        // Check if article already exists
        const currentRates = get(rates);
        if (currentRates.some((r) => r.article === normalizedArticle)) {
                return false; // Article already exists
        }
        
        rates.update((rs) => {
                return [
                        {
                                id: crypto.randomUUID(),
                                article: normalizedArticle,
                                norm
                        },
                        ...rs
                ];
        });
        
        return true;
}

/**
 * Updates an existing rate
 */
export function updateRate(id: string, article: string, norm: number): boolean {
        const normalizedArticle = article.toUpperCase().replace(/\s+/g, '');
        
        rates.update((rs) => {
                const index = rs.findIndex((r) => r.id === id);
                if (index === -1) return rs;
                
                // Check if new article conflicts with existing (excluding current)
                const conflict = rs.some((r) => r.article === normalizedArticle && r.id !== id);
                if (conflict) return rs;
                
                // Update the rate and move to top
                const updated = rs.filter((r) => r.id !== id);
                updated.unshift({
                        id,
                        article: normalizedArticle,
                        norm
                });
                
                return updated;
        });
        
        return true;
}

/**
 * Deletes a rate
 */
export function deleteRate(id: string): void {
        rates.update((rs) => rs.filter((r) => r.id !== id));
        
        // Also delete any plan items with this article
        planItems.update((ps) => {
                const rate = get(rates).find((r) => r.id === id);
                if (rate) {
                        return ps.filter((p) => p.article !== rate.article);
                }
                return ps;
        });
}

/**
 * Adds a new plan item
 */
export function addPlanItem(article: string, target: number): boolean {
        const normalizedArticle = article.toUpperCase().replace(/\s+/g, '');
        
        // Check if article has a rate
        const currentRates = get(rates);
        if (!currentRates.some((r) => r.article === normalizedArticle)) {
                return false; // No rate for this article
        }
        
        // Check if plan item already exists
        const currentPlan = get(planItems);
        if (currentPlan.some((p) => p.article === normalizedArticle)) {
                return false; // Plan item already exists
        }
        
        planItems.update((ps) => {
                return [
                        {
                                id: crypto.randomUUID(),
                                article: normalizedArticle,
                                target,
                                completed: 0,
                                locked: false
                        },
                        ...ps
                ];
        });
        
        return true;
}

/**
 * Updates a plan item
 */
export function updatePlanItem(id: string, target: number): void {
        planItems.update((ps) => {
                const index = ps.findIndex((p) => p.id === id);
                if (index === -1) return ps;
                
                // Update target and recalculate locked status
                const item = ps[index];
                const updated = [...ps];
                updated[index] = {
                        ...item,
                        target,
                        locked: item.completed >= target
                };
                
                // Move to top
                const moved = updated.filter((p) => p.id !== id);
                moved.unshift(updated[index]);
                
                return moved;
        });
}

/**
 * Deletes a plan item
 */
export function deletePlanItem(id: string): void {
        planItems.update((ps) => ps.filter((p) => p.id !== id));
}

/**
 * Adds a new welder
 */
export function addWelder(lastName: string): boolean {
        const normalized = lastName.trim();
        const capitalizedName = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
        
        // Check if welder with same last name exists
        const currentWelders = get(welders);
        if (currentWelders.some((w) => w.lastName.toLowerCase() === capitalizedName.toLowerCase())) {
                return false;
        }
        
        welders.update((ws) => {
                return [
                        {
                                id: crypto.randomUUID(),
                                lastName: capitalizedName,
                                entries: [],
                                overtime: {},
                                manualOvertimeOverrides: {}
                        },
                        ...ws
                ];
        });
        
        return true;
}

/**
 * Deletes a welder
 */
export function deleteWelder(id: string): void {
        welders.update((ws) => ws.filter((w) => w.id !== id));
        syncPlanCompleted();
}

/**
 * Adds or updates a WC entry for a welder
 * If same article exists for same date, quantities are summed
 */
export function addWCEntry(
        welderId: string,
        article: string,
        quantity: number,
        date: string
): boolean {
        const normalizedArticle = article.toUpperCase().replace(/\s+/g, '');
        
        // Check if plan item exists and is not locked
        const currentPlan = get(planItems);
        const planItem = currentPlan.find((p) => p.article === normalizedArticle);
        
        if (!planItem) {
                return false; // No plan item for this article
        }
        
        // Check if plan is locked (but allow if we're updating existing entry)
        const currentWelders = get(welders);
        const welder = currentWelders.find((w) => w.id === welderId);
        
        if (!welder) {
                return false;
        }
        
        // Check for existing entry with same article and date
        const existingIndex = welder.entries.findIndex(
                (e) => e.article === normalizedArticle && e.date === date
        );
        
        welders.update((ws) => {
                return ws.map((w) => {
                        if (w.id !== welderId) return w;
                        
                        let newEntries: typeof w.entries;
                        const now = Date.now();
                        
                        if (existingIndex !== -1) {
                                // Update existing entry - sum quantities
                                newEntries = [...w.entries];
                                newEntries[existingIndex] = {
                                        ...newEntries[existingIndex],
                                        quantity: newEntries[existingIndex].quantity + quantity,
                                        updatedAt: now
                                };
                        } else {
                                // Add new entry
                                if (planItem.locked) {
                                        return w; // Don't add if plan is locked
                                }
                                newEntries = [
                                        {
                                                id: crypto.randomUUID(),
                                                article: normalizedArticle,
                                                quantity,
                                                date,
                                                updatedAt: now
                                        },
                                        ...w.entries
                                ];
                        }
                        
                        // Recalculate overtime for this date
                        const currentRates = get(rates);
                        const dayEntries = newEntries.filter((e) => e.date === date);
                        let totalHours = 0;
                        for (const entry of dayEntries) {
                                const rate = currentRates.find((r) => r.article === entry.article);
                                if (rate) {
                                        totalHours += rate.norm * entry.quantity;
                                }
                        }
                        
                        const overtime = Math.max(0, totalHours - 8);
                        const newOvertime = { ...w.overtime };
                        
                        // Only auto-calculate overtime if not manually overridden
                        if (!w.manualOvertimeOverrides[date]) {
                                newOvertime[date] = overtime;
                        }
                        
                        return {
                                ...w,
                                entries: newEntries,
                                overtime: newOvertime
                        };
                });
        });
        
        syncPlanCompleted();
        return true;
}

/**
 * Updates a WC entry
 */
export function updateWCEntry(
        welderId: string,
        entryId: string,
        quantity: number
): void {
        welders.update((ws) => {
                return ws.map((w) => {
                        if (w.id !== welderId) return w;
                        
                        const entryIndex = w.entries.findIndex((e) => e.id === entryId);
                        if (entryIndex === -1) return w;
                        
                        const entry = w.entries[entryIndex];
                        const now = Date.now();
                        
                        // Update entry and move to top
                        const newEntries = w.entries.filter((e) => e.id !== entryId);
                        newEntries.unshift({
                                ...entry,
                                quantity,
                                updatedAt: now
                        });
                        
                        // Recalculate overtime for the entry's date
                        const currentRates = get(rates);
                        const dayEntries = newEntries.filter((e) => e.date === entry.date);
                        let totalHours = 0;
                        for (const e of dayEntries) {
                                const rate = currentRates.find((r) => r.article === e.article);
                                if (rate) {
                                        totalHours += rate.norm * e.quantity;
                                }
                        }
                        
                        const overtime = Math.max(0, totalHours - 8);
                        const newOvertime = { ...w.overtime };
                        
                        if (!w.manualOvertimeOverrides[entry.date]) {
                                newOvertime[entry.date] = overtime;
                        }
                        
                        return {
                                ...w,
                                entries: newEntries,
                                overtime: newOvertime
                        };
                });
        });
        
        syncPlanCompleted();
}

/**
 * Deletes a WC entry
 */
export function deleteWCEntry(welderId: string, entryId: string): void {
        welders.update((ws) => {
                return ws.map((w) => {
                        if (w.id !== welderId) return w;
                        
                        const entry = w.entries.find((e) => e.id === entryId);
                        if (!entry) return w;
                        
                        const newEntries = w.entries.filter((e) => e.id !== entryId);
                        
                        // Recalculate overtime for the entry's date
                        const currentRates = get(rates);
                        const dayEntries = newEntries.filter((e) => e.date === entry.date);
                        let totalHours = 0;
                        for (const e of dayEntries) {
                                const rate = currentRates.find((r) => r.article === e.article);
                                if (rate) {
                                        totalHours += rate.norm * e.quantity;
                                }
                        }
                        
                        const overtime = Math.max(0, totalHours - 8);
                        const newOvertime = { ...w.overtime };
                        
                        if (!w.manualOvertimeOverrides[entry.date]) {
                                newOvertime[entry.date] = overtime;
                        }
                        
                        return {
                                ...w,
                                entries: newEntries,
                                overtime: newOvertime
                        };
                });
        });
        
        syncPlanCompleted();
}

/**
 * Manually sets overtime for a welder on a specific date
 */
export function setManualOvertime(welderId: string, date: string, hours: number): void {
        welders.update((ws) => {
                return ws.map((w) => {
                        if (w.id !== welderId) return w;
                        
                        return {
                                ...w,
                                overtime: {
                                        ...w.overtime,
                                        [date]: hours
                                },
                                manualOvertimeOverrides: {
                                        ...w.manualOvertimeOverrides,
                                        [date]: true
                                }
                        };
                });
        });
}

/**
 * Resets manual overtime override for a date (allows auto-calculation again)
 */
export function resetOvertimeOverride(welderId: string, date: string): void {
        welders.update((ws) => {
                return ws.map((w) => {
                        if (w.id !== welderId) return w;
                        
                        const newOverrides = { ...w.manualOvertimeOverrides };
                        delete newOverrides[date];
                        
                        // Recalculate overtime for this date
                        const currentRates = get(rates);
                        const dayEntries = w.entries.filter((e) => e.date === date);
                        let totalHours = 0;
                        for (const e of dayEntries) {
                                const rate = currentRates.find((r) => r.article === e.article);
                                if (rate) {
                                        totalHours += rate.norm * e.quantity;
                                }
                        }
                        
                        const overtime = Math.max(0, totalHours - 8);
                        
                        return {
                                ...w,
                                overtime: {
                                        ...w.overtime,
                                        [date]: overtime
                                },
                                manualOvertimeOverrides: newOverrides
                        };
                });
        });
}

/**
 * Syncs plan completed values with welder entries
 */
export function syncPlanCompleted(): void {
        const currentWelders = get(welders);
        planItems.update((ps) => {
                return recalcPlanCompleted(ps, currentWelders);
        });
}

/**
 * Exports all app data to JSON
 */
export function exportData(): AppState {
        const currentWelders = get(welders);
        const currentRates = get(rates);
        const currentPlan = get(planItems);
        
        return {
                welders: currentWelders,
                rates: currentRates,
                planItems: currentPlan,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
        };
}

/**
 * Imports data from JSON, merging with existing
 */
export function importData(data: AppState): void {
        // Merge rates - add only new articles
        rates.update((rs) => {
                const existingArticles = new Set(rs.map((r) => r.article));
                const newRates = data.rates.filter((r) => !existingArticles.has(r.article));
                return [...rs, ...newRates];
        });
        
        // Merge plan items - add only new articles
        planItems.update((ps) => {
                const existingArticles = new Set(ps.map((p) => p.article));
                const newItems = data.planItems.filter((p) => !existingArticles.has(p.article));
                return [...ps, ...newItems];
        });
        
        // Merge welders - merge entries for matching last names
        welders.update((ws) => {
                const existingByLastName = new Map(ws.map((w) => [w.lastName.toLowerCase(), w]));
                
                // Apply migration to imported welders
                const migratedImportedWelders = migrateWelderData(data.welders);
                
                for (const importedWelder of migratedImportedWelders) {
                        const existing = existingByLastName.get(importedWelder.lastName.toLowerCase());
                        
                        if (existing) {
                                // Merge entries - add non-duplicate entry IDs
                                const existingEntryIds = new Set(existing.entries.map((e) => e.id));
                                const newEntries = importedWelder.entries.filter(
                                        (e) => !existingEntryIds.has(e.id)
                                );
                                existing.entries = [...existing.entries, ...newEntries];
                                
                                // Merge overtime
                                for (const [date, hours] of Object.entries(importedWelder.overtime)) {
                                        if (!(date in existing.overtime)) {
                                                existing.overtime[date] = hours;
                                        }
                                }
                                
                                // Merge manualOvertimeOverrides
                                if (importedWelder.manualOvertimeOverrides) {
                                        existing.manualOvertimeOverrides = {
                                                ...existing.manualOvertimeOverrides,
                                                ...importedWelder.manualOvertimeOverrides
                                        };
                                }
                        } else {
                                // Add new welder
                                ws.push(importedWelder);
                        }
                }
                
                return [...ws];
        });
        
        // Sync plan completed values after import
        syncPlanCompleted();
}

/**
 * Clears all data
 */
export function clearAllData(): void {
        rates.set([]);
        planItems.set([]);
        welders.set([]);
}
