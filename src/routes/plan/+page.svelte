<script lang="ts">
        import { rates, planItems, calculatedPlanItems, addPlanItem, updatePlanItem, deletePlanItem } from '$lib/stores';
        import { normalizeArticle, formatQty, longpressAction } from '$lib/utils';
        import type { PlanItem } from '$lib/types';
        
        let articleInput = $state('');
        let targetInput = $state('');
        let showSuggestions = $state(false);
        let highlightedIndex = $state(0);
        let editModal = $state<{ show: boolean; planItem: PlanItem | null }>({ show: false, planItem: null });
        let editTargetInput = $state('');
        
        let filteredSuggestions = $derived(getFilteredSuggestions(articleInput, $rates));
        let suggestionsAvailable = $derived(filteredSuggestions.length > 0 && showSuggestions);
        
        function getFilteredSuggestions(input: string, ratesList: typeof $rates): string[] {
                const normalized = normalizeArticle(input);
                if (!normalized) return [];
                const existingPlanArticles = new Set($planItems.map(p => p.article));
                return [...new Set(ratesList.filter(r => r.article.startsWith(normalized) && !existingPlanArticles.has(r.article)).map(r => r.article))].slice(0, 5);
        }
        
        function handleArticleFocus() { showSuggestions = true; highlightedIndex = 0; }
        function handleArticleBlur() { setTimeout(() => { showSuggestions = false; }, 200); }
        
        function handleArticleKeyDown(e: KeyboardEvent) {
                if (e.key === 'ArrowDown') { e.preventDefault(); if (suggestionsAvailable && highlightedIndex < filteredSuggestions.length - 1) highlightedIndex++; }
                else if (e.key === 'ArrowUp') { e.preventDefault(); if (highlightedIndex > 0) highlightedIndex--; }
                else if (e.key === 'Enter') { e.preventDefault(); if (suggestionsAvailable && highlightedIndex >= 0) { articleInput = filteredSuggestions[highlightedIndex]; showSuggestions = false; } else handleSubmit(); }
                else if (e.key === 'Escape') showSuggestions = false;
        }
        
        function selectSuggestion(article: string) { articleInput = article; showSuggestions = false; }
        
        function handleSubmit() {
                const article = normalizeArticle(articleInput);
                const target = parseFloat(targetInput.replace(',', '.'));
                if (!article) { alert('Введите артикул'); return; }
                if (!$rates.some(r => r.article === article)) { alert('Артикул не найден в нормах. Сначала добавьте норму времени.'); return; }
                if (isNaN(target) || target <= 0) { alert('Введите корректное количество'); return; }
                if (!addPlanItem(article, target)) { alert('Позиция для этого артикула уже существует'); return; }
                articleInput = ''; targetInput = ''; showSuggestions = false;
        }
        
        function handleLongPress(planItem: PlanItem) { editModal = { show: true, planItem }; editTargetInput = planItem.target.toString(); }
        
        function handleEditSubmit() {
                if (!editModal.planItem) return;
                const target = parseFloat(editTargetInput.replace(',', '.'));
                if (isNaN(target) || target <= 0) { alert('Введите корректное количество'); return; }
                updatePlanItem(editModal.planItem.id, target);
                editModal = { show: false, planItem: null };
        }
        
        function handleDelete() {
                if (!editModal.planItem) return;
                if (confirm(`Удалить план для ${editModal.planItem.article}?`)) {
                        deletePlanItem(editModal.planItem.id);
                        editModal = { show: false, planItem: null };
                }
        }
        
        function closeEditModal() { editModal = { show: false, planItem: null }; }
</script>

<svelte:head><title>WeldTrack - План</title></svelte:head>

<div class="page-container">
        <header class="fixed-header">
                <div class="header-content">
                        <h1>План производства</h1>
                        <div class="input-row">
                                <div class="input-wrapper">
                                        <input type="text" class="input-field article-input" placeholder="Артикул" bind:value={articleInput} onfocus={handleArticleFocus} onblur={handleArticleBlur} onkeydown={handleArticleKeyDown} autocomplete="off" autocapitalize="characters"/>
                                        {#if suggestionsAvailable}
                                                <div class="suggestion-dropdown">
                                                        {#each filteredSuggestions as article, i (article)}
                                                                <div class="suggestion-item" class:highlighted={i === highlightedIndex} onclick={() => selectSuggestion(article)}>
                                                                        <span class="article-badge">{article}</span>
                                                                </div>
                                                        {/each}
                                                </div>
                                        {/if}
                                </div>
                                <div class="input-divider">|</div>
                                <input type="text" class="input-field target-input" placeholder="План (шт)" bind:value={targetInput} onkeydown={(e) => e.key === 'Enter' && handleSubmit()} inputmode="decimal" autocomplete="off"/>
                                <button class="btn btn-primary" onclick={handleSubmit}>Добавить</button>
                        </div>
                </div>
        </header>
        
        <div class="scrollable-content page-content">
                {#if $calculatedPlanItems.length === 0}
                        <div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-text">Нет позиций плана.<br/>Добавьте первую позицию выше.<br/><br/><small>Сначала добавьте нормы времени для артикулов.</small></div></div>
                {:else}
                        <div class="plan-list">
                                {#each $calculatedPlanItems as planItem (planItem.id)}
                                        <div class="plan-item" class:locked={planItem.locked} use:longpressAction={() => handleLongPress(planItem)}>
                                                <div class="plan-left">
                                                        <span class="article-badge" class:article-locked={planItem.locked}>{planItem.article}</span>
                                                        {#if planItem.locked}<span class="locked-badge">ПЛАН ВЫПОЛНЕН</span>{/if}
                                                </div>
                                                <div class="plan-right">
                                                        <span class="plan-target">{formatQty(planItem.target)}</span>
                                                        <span class="plan-divider">/</span>
                                                        <span class="plan-completed">{formatQty(planItem.completed)}</span>
                                                        <span class="plan-unit">шт</span>
                                                </div>
                                        </div>
                                {/each}
                        </div>
                {/if}
        </div>
</div>

{#if editModal.show && editModal.planItem}
<div class="modal-overlay" onclick={closeEditModal}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
                <h2 class="modal-title">Редактировать план</h2>
                <div class="modal-info">
                        <span class="article-badge">{editModal.planItem.article}</span>
                        <span class="info-text">Выполнено: {formatQty(editModal.planItem.completed)} шт</span>
                </div>
                <div class="modal-body">
                        <div class="form-group"><label>План (штук)</label><input type="text" class="input-field" bind:value={editTargetInput} inputmode="decimal" autocomplete="off"/></div>
                </div>
                <div class="modal-actions">
                        <button class="btn btn-danger" onclick={handleDelete}>Удалить</button>
                        <button class="btn btn-secondary" onclick={closeEditModal}>Отмена</button>
                        <button class="btn btn-primary" onclick={handleEditSubmit}>Сохранить</button>
                </div>
        </div>
</div>
{/if}

<style>
        .page-container { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; }
        .header-content { padding: 1rem; }
        .header-content h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text-primary); margin-bottom: 1rem; }
        .input-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .input-wrapper { position: relative; flex: 1; min-width: 100px; }
        .article-input { text-transform: uppercase; }
        .input-divider { color: var(--color-text-muted); font-weight: 600; }
        .target-input { width: 100px; text-align: center; }
        .highlighted { background-color: var(--color-bg-tertiary); }
        .plan-list { padding: 0.5rem; }
        .plan-item { display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: var(--color-bg-secondary); border-radius: 0.75rem; margin-bottom: 0.5rem; cursor: pointer; min-height: 56px; }
        .plan-item.locked { background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1)); border: 1px solid var(--color-success); }
        .plan-left { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .plan-right { display: flex; align-items: baseline; gap: 0.25rem; }
        .plan-target { font-size: 1rem; font-weight: 600; color: var(--color-text-primary); font-family: 'Courier New', monospace; }
        .plan-divider { color: var(--color-text-muted); }
        .plan-completed { font-size: 1rem; font-weight: 600; color: var(--color-accent); font-family: 'Courier New', monospace; }
        .plan-item.locked .plan-completed { color: var(--color-success); }
        .plan-unit { font-size: 0.875rem; color: var(--color-text-secondary); }
        .modal-title { font-size: 1.25rem; font-weight: 700; color: var(--color-text-primary); margin-bottom: 1rem; }
        .modal-info { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--color-bg-tertiary); border-radius: 0.5rem; margin-bottom: 1rem; }
        .info-text { font-size: 0.875rem; color: var(--color-text-secondary); }
        .modal-body { padding: 0.5rem 0 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0.5rem; }
        .modal-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .modal-actions .btn { flex: 1; min-width: 80px; }
</style>