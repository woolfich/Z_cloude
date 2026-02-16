<script lang="ts">
        import { page } from '$app/stores';
        import { goto } from '$app/navigation';
        import { welders, calculatedPlanItems, addWCEntry, updateWCEntry, deleteWCEntry, setManualOvertime, resetOvertimeOverride } from '$lib/stores';
        import { normalizeArticle, formatQty, getTodayISO, getWelderProgressByArticle, longpressAction } from '$lib/utils';
        import type { WCEntry, Welder } from '$lib/types';
        
        let welderId = $derived($page.params.id);
        let today = getTodayISO();
        let articleInput = $state('');
        let quantityInput = $state('');
        let showSuggestions = $state(false);
        let highlightedIndex = $state(0);
        let stage = $state<'article' | 'quantity'>('article');
        let selectedArticle = $state('');
        let editModal = $state<{ show: boolean; entry: WCEntry | null }>({ show: false, entry: null });
        let overtimeModal = $state<{ show: boolean; date: string }>({ show: false, date: '' });
        let overtimeInput = $state('');
        
        let welder = $derived($welders.find((w: Welder) => w.id === welderId));
        let unlockedPlanItems = $derived($calculatedPlanItems.filter((p) => !p.locked));
        let sortedEntries = $derived(welder ? [...welder.entries].sort((a, b) => b.updatedAt - a.updatedAt) : []);
        let filteredSuggestions = $derived(getFilteredSuggestions(articleInput, unlockedPlanItems));
        let suggestionsAvailable = $derived(filteredSuggestions.length > 0 && showSuggestions);
        let currentOvertime = $derived(welder?.overtime[today] || 0);
        let selectedPlanItem = $derived($calculatedPlanItems.find((p) => p.article === selectedArticle));
        let selectedProgress = $derived(getWelderProgressByArticle(selectedArticle, $welders));
        
        function getFilteredSuggestions(input: string, planItems: { article: string }[]): string[] {
                const normalized = normalizeArticle(input);
                if (!normalized) return planItems.map((p) => p.article).slice(0, 5);
                return [...new Set(planItems.filter((p) => p.article.startsWith(normalized) && p.article !== normalized).map((p) => p.article))].slice(0, 5);
        }
        
        function handleArticleFocus() { showSuggestions = true; highlightedIndex = 0; }
        function handleArticleBlur() { setTimeout(() => { showSuggestions = false; }, 200); }
        
        function handleArticleKeyDown(e: KeyboardEvent) {
                if (e.key === 'ArrowDown') { e.preventDefault(); if (suggestionsAvailable && highlightedIndex < filteredSuggestions.length - 1) highlightedIndex++; }
                else if (e.key === 'ArrowUp') { e.preventDefault(); if (highlightedIndex > 0) highlightedIndex--; }
                else if (e.key === 'Enter') { e.preventDefault(); if (suggestionsAvailable && highlightedIndex >= 0) selectArticle(filteredSuggestions[highlightedIndex]); else if (articleInput.trim()) selectArticle(normalizeArticle(articleInput)); }
                else if (e.key === 'Escape') showSuggestions = false;
        }
        
        function selectArticle(article: string) {
                const normalized = normalizeArticle(article);
                const planItem = $calculatedPlanItems.find((p) => p.article === normalized);
                if (!planItem) { alert('Артикул не найден в плане'); return; }
                if (planItem.locked) { alert('План выполнен. Добавление невозможно.'); return; }
                selectedArticle = normalized; articleInput = normalized; showSuggestions = false; stage = 'quantity'; quantityInput = '';
        }
        
        function handleQuantityKeyDown(e: KeyboardEvent) {
                if (e.key === 'Enter') { e.preventDefault(); submitEntry(); }
                else if (e.key === 'Escape') resetInput();
        }
        
        function submitEntry() {
                if (!welder) return;
                const quantity = parseFloat(quantityInput.replace(',', '.'));
                if (isNaN(quantity) || quantity <= 0) { alert('Введите корректное количество'); return; }
                const planItem = $calculatedPlanItems.find((p) => p.article === selectedArticle);
                if (!planItem || planItem.locked) { alert('План выполнен. Добавление невозможно.'); resetInput(); return; }
                if (!addWCEntry(welder.id, selectedArticle, quantity, today)) { alert('Ошибка при добавлении записи'); return; }
                resetInput();
        }
        
        function resetInput() { articleInput = ''; quantityInput = ''; selectedArticle = ''; stage = 'article'; showSuggestions = false; }
        function handleEntryClick(entry: WCEntry) { selectedArticle = entry.article; articleInput = entry.article; stage = 'quantity'; quantityInput = ''; }
        function handleLongPress(entry: WCEntry) { editModal = { show: true, entry }; quantityInput = entry.quantity.toString(); }
        
        function handleEditSubmit() {
                if (!editModal.entry || !welder) return;
                const quantity = parseFloat(quantityInput.replace(',', '.'));
                if (isNaN(quantity) || quantity <= 0) { alert('Введите корректное количество'); return; }
                updateWCEntry(welder.id, editModal.entry.id, quantity);
                editModal = { show: false, entry: null }; quantityInput = '';
        }
        
        function handleDeleteEntry() {
                if (!editModal.entry || !welder) return;
                if (confirm(`Удалить запись ${editModal.entry.article} ${formatQty(editModal.entry.quantity)} шт?`)) {
                        deleteWCEntry(welder.id, editModal.entry.id);
                        editModal = { show: false, entry: null };
                }
        }
        
        function openOvertimeModal() { if (!welder) return; overtimeModal = { show: true, date: today }; overtimeInput = (welder.overtime[today] || 0).toString(); }
        function handleOvertimeSubmit() {
                if (!welder) return;
                const hours = parseFloat(overtimeInput.replace(',', '.'));
                if (isNaN(hours) || hours < 0) { alert('Введите корректное количество часов'); return; }
                setManualOvertime(welder.id, overtimeModal.date, hours);
                overtimeModal = { show: false, date: '' };
        }
        function handleResetOvertime() { if (!welder) return; resetOvertimeOverride(welder.id, overtimeModal.date); overtimeInput = (welder.overtime[overtimeModal.date] || 0).toString(); }
        function closeEditModal() { editModal = { show: false, entry: null }; }
        function closeOvertimeModal() { overtimeModal = { show: false, date: '' }; }
        function goBack() { goto('/'); }
        function isEntryLocked(article: string): boolean { return $calculatedPlanItems.find((p) => p.article === article)?.locked ?? false; }
</script>

<svelte:head><title>WeldTrack - {welder?.lastName || 'Карточка'}</title></svelte:head>

<div class="page-container">
        <header class="fixed-header">
                <div class="header-content">
                        <div class="header-top">
                                <button class="back-btn" onclick={goBack}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                                </button>
                                <h1>{welder?.lastName || 'Сварщик'}</h1>
                        </div>
                        <div class="input-area">
                                {#if stage === 'article'}
                                        <div class="input-wrapper">
                                                <input type="text" class="input-field article-input" placeholder="Артикул" bind:value={articleInput} onfocus={handleArticleFocus} onblur={handleArticleBlur} onkeydown={handleArticleKeyDown} autocomplete="off" autocapitalize="characters"/>
                                                {#if suggestionsAvailable}
                                                        <div class="suggestion-dropdown">
                                                                {#each filteredSuggestions as article, i (article)}
                                                                        <div class="suggestion-item" class:highlighted={i === highlightedIndex} onclick={() => selectArticle(article)}><span class="article-badge">{article}</span></div>
                                                                {/each}
                                                        </div>
                                                {/if}
                                        </div>
                                {:else}
                                        <div class="info-panel">
                                                <div class="info-article">{selectedArticle}</div>
                                                <div class="info-details">
                                                        <span class="info-target">План: {selectedPlanItem ? formatQty(selectedPlanItem.target) : '0.00'} шт</span>
                                                        <span class="info-divider">|</span>
                                                        <span class="info-progress">
                                                                {#each selectedProgress as p, i}{#if i > 0}, {/if}{p.lastName}: {formatQty(p.quantity)}{/each}
                                                                {#if selectedProgress.length === 0}Нет записей{/if}
                                                        </span>
                                                </div>
                                        </div>
                                        <div class="quantity-input-row">
                                                <input type="text" class="input-field" placeholder="Количество (шт)" bind:value={quantityInput} onkeydown={handleQuantityKeyDown} inputmode="decimal" autocomplete="off"/>
                                                <button class="btn btn-primary" onclick={submitEntry}>Добавить</button>
                                                <button class="btn btn-secondary" onclick={resetInput}>Отмена</button>
                                        </div>
                                {/if}
                        </div>
                </div>
        </header>
        
        <div class="scrollable-content page-content">
                {#if !welder}
                        <div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">Сварщик не найден</div></div>
                {:else if sortedEntries.length === 0}
                        <div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">Нет записей.<br/>Добавьте первую запись выше.</div></div>
                {:else}
                        <div class="entries-list">
                                {#each sortedEntries as entry (entry.id)}
                                        {@const isLocked = isEntryLocked(entry.article)}
                                        <div class="entry-item" class:locked={isLocked} onclick={() => handleEntryClick(entry)} use:longpressAction={() => handleLongPress(entry)}>
                                                <span class="entry-article" class:article-locked={isLocked}>{entry.article}</span>
                                                {#if isLocked}<span class="locked-label">(план выполнен)</span>{/if}
                                                <span class="dotted-line"></span>
                                                <span class="entry-quantity">{formatQty(entry.quantity)} шт</span>
                                        </div>
                                {/each}
                        </div>
                {/if}
        </div>
        
        <div class="overtime-display" onclick={openOvertimeModal}>
                <div class="overtime-label">Переработка:</div>
                <div class="overtime-value" class:zero={currentOvertime === 0}>{formatQty(currentOvertime)} ч</div>
        </div>
</div>

{#if editModal.show && editModal.entry}
<div class="modal-overlay" onclick={closeEditModal}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
                <h2 class="modal-title">Редактировать запись</h2>
                <div class="modal-info"><span class="article-badge">{editModal.entry.article}</span><span class="info-text">Дата: {editModal.entry.date}</span></div>
                <div class="modal-body"><div class="form-group"><label>Количество (шт)</label><input type="text" class="input-field" bind:value={quantityInput} inputmode="decimal" autocomplete="off"/></div></div>
                <div class="modal-actions">
                        <button class="btn btn-danger" onclick={handleDeleteEntry}>Удалить</button>
                        <button class="btn btn-secondary" onclick={closeEditModal}>Отмена</button>
                        <button class="btn btn-primary" onclick={handleEditSubmit}>Сохранить</button>
                </div>
        </div>
</div>
{/if}

{#if overtimeModal.show}
<div class="modal-overlay" onclick={closeOvertimeModal}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
                <h2 class="modal-title">Переработка</h2>
                <div class="modal-info"><span class="info-text">Дата: {overtimeModal.date}</span></div>
                <div class="modal-body">
                        <div class="form-group"><label>Часы переработки</label><input type="text" class="input-field" bind:value={overtimeInput} inputmode="decimal" autocomplete="off"/></div>
                        {#if welder?.manualOvertimeOverrides?.[overtimeModal.date]}
                                <div class="manual-override-note">⚠️ Значение изменено вручную</div>
                                <button class="btn btn-secondary w-full" onclick={handleResetOvertime}>Сбросить автоматический расчёт</button>
                        {/if}
                </div>
                <div class="modal-actions">
                        <button class="btn btn-secondary" onclick={closeOvertimeModal}>Отмена</button>
                        <button class="btn btn-primary" onclick={handleOvertimeSubmit}>Сохранить</button>
                </div>
        </div>
</div>
{/if}

<style>
        .page-container { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; }
        .header-content { padding: 1rem; }
        .header-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
        .back-btn { background: none; border: none; color: var(--color-text-secondary); cursor: pointer; padding: 0.5rem; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; }
        .back-btn:active { background: var(--color-bg-tertiary); color: var(--color-text-primary); }
        .header-top h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
        .input-area { display: flex; flex-direction: column; gap: 0.75rem; }
        .input-wrapper { position: relative; }
        .article-input { text-transform: uppercase; }
        .highlighted { background-color: var(--color-bg-tertiary); }
        .info-panel { background: var(--color-bg-tertiary); padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; }
        .info-article { font-size: 1.25rem; font-weight: 700; color: var(--color-accent); font-family: 'Courier New', monospace; margin-bottom: 0.5rem; }
        .info-details { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--color-text-secondary); }
        .info-target { color: var(--color-text-primary); }
        .info-divider { color: var(--color-text-muted); }
        .quantity-input-row { display: flex; gap: 0.5rem; }
        .quantity-input-row .input-field { flex: 1; }
        .entries-list { padding: 0.5rem; }
        .entry-item { display: flex; align-items: center; padding: 1rem; background: var(--color-bg-secondary); border-radius: 0.75rem; margin-bottom: 0.5rem; cursor: pointer; min-height: 56px; }
        .entry-item.locked { opacity: 0.7; }
        .entry-item:active { transform: scale(0.99); }
        .entry-article { font-weight: 600; font-family: 'Courier New', monospace; color: var(--color-text-primary); }
        .article-locked { text-decoration: line-through; color: var(--color-text-muted); }
        .locked-label { font-size: 0.75rem; color: var(--color-text-muted); margin-left: 0.5rem; }
        .dotted-line { flex: 1; border-bottom: 1px dotted var(--color-text-muted); margin: 0 0.5rem; min-width: 20px; }
        .entry-quantity { font-size: 1rem; font-weight: 600; color: var(--color-accent); font-family: 'Courier New', monospace; white-space: nowrap; }
        .overtime-display { position: fixed; right: 0; top: 50%; transform: translateY(-50%); background: linear-gradient(to right, transparent, var(--color-bg-secondary) 30%); padding: 0.75rem 1rem; padding-left: 2rem; z-index: 50; cursor: pointer; border-radius: 0.5rem 0 0 0.5rem; border: 1px solid var(--color-border); border-right: none; }
        .overtime-label { font-size: 0.75rem; color: var(--color-text-muted); text-align: right; }
        .overtime-value { font-size: 1.25rem; font-weight: 600; color: var(--color-warning); text-align: right; }
        .overtime-value.zero { color: var(--color-text-muted); }
        .modal-overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 2000; }
        .modal-content { width: 100%; max-width: 500px; background-color: var(--color-bg-secondary); border-radius: 1rem 1rem 0 0; padding: 1.5rem; }
        .modal-title { font-size: 1.25rem; font-weight: 700; color: var(--color-text-primary); margin-bottom: 1rem; }
        .modal-info { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--color-bg-tertiary); border-radius: 0.5rem; margin-bottom: 1rem; }
        .info-text { font-size: 0.875rem; color: var(--color-text-secondary); }
        .modal-body { padding: 0.5rem 0 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0.5rem; }
        .manual-override-note { font-size: 0.75rem; color: var(--color-warning); margin-bottom: 0.75rem; padding: 0.5rem; background: rgba(245, 158, 11, 0.1); border-radius: 0.25rem; }
        .modal-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .modal-actions .btn { flex: 1; min-width: 80px; }
        .w-full { width: 100%; }
</style>