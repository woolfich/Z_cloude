<script lang="ts">
        import { rates, addRate, updateRate, deleteRate } from '$lib/stores';
        import { normalizeArticle, formatQty } from '$lib/utils';
        import type { Rate } from '$lib/types';
        
        let articleInput = $state('');
        let normInput = $state('');
        let showSuggestions = $state(false);
        let highlightedIndex = $state(0);
        let editModal = $state<{ show: boolean; rate: Rate | null }>({ show: false, rate: null });
        let deleteModal = $state<{ show: boolean; rate: Rate | null }>({ show: false, rate: null });
        let editArticleInput = $state('');
        let editNormInput = $state('');
        
        let filteredSuggestions = $derived(getFilteredSuggestions(articleInput, $rates));
        let suggestionsAvailable = $derived(filteredSuggestions.length > 0 && showSuggestions);
        
        function getFilteredSuggestions(input: string, ratesList: Rate[]): string[] {
                const normalized = normalizeArticle(input);
                if (!normalized) return [];
                
                // Get all unique articles that start with the input
                const matching = ratesList
                        .filter(r => r.article.startsWith(normalized) && r.article !== normalized)
                        .map(r => r.article);
                
                return [...new Set(matching)].slice(0, 5);
        }
        
        function handleArticleFocus() {
                showSuggestions = true;
                highlightedIndex = 0;
        }
        
        function handleArticleBlur() {
                // Delay to allow suggestion click
                setTimeout(() => {
                        showSuggestions = false;
                }, 200);
        }
        
        function handleArticleKeyDown(e: KeyboardEvent) {
                if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (suggestionsAvailable && highlightedIndex < filteredSuggestions.length - 1) {
                                highlightedIndex++;
                        }
                } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (highlightedIndex > 0) {
                                highlightedIndex--;
                        }
                } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (suggestionsAvailable && highlightedIndex >= 0) {
                                articleInput = filteredSuggestions[highlightedIndex];
                                showSuggestions = false;
                        } else {
                                handleSubmit();
                        }
                } else if (e.key === 'Escape') {
                        showSuggestions = false;
                }
        }
        
        function selectSuggestion(article: string) {
                articleInput = article;
                showSuggestions = false;
        }
        
        function handleSubmit() {
                const article = normalizeArticle(articleInput);
                const norm = parseFloat(normInput.replace(',', '.'));
                
                if (!article) {
                        alert('Введите артикул');
                        return;
                }
                
                if (isNaN(norm) || norm <= 0) {
                        alert('Введите корректную норму времени');
                        return;
                }
                
                const success = addRate(article, norm);
                if (!success) {
                        alert('Артикул уже существует');
                        return;
                }
                
                articleInput = '';
                normInput = '';
                showSuggestions = false;
        }
        
        function handleLongPress(rate: Rate) {
                editModal = { show: true, rate };
                editArticleInput = rate.article;
                editNormInput = rate.norm.toString();
        }
        
        function handleEditSubmit() {
                if (!editModal.rate) return;
                
                const article = normalizeArticle(editArticleInput);
                const norm = parseFloat(editNormInput.replace(',', '.'));
                
                if (!article) {
                        alert('Введите артикул');
                        return;
                }
                
                if (isNaN(norm) || norm <= 0) {
                        alert('Введите корректную норму времени');
                        return;
                }
                
                updateRate(editModal.rate.id, article, norm);
                editModal = { show: false, rate: null };
        }
        
        function handleDelete() {
                if (!deleteModal.rate) return;
                
                if (confirm(`Удалить норму для ${deleteModal.rate.article}? Это также удалит связанные позиции плана.`)) {
                        deleteRate(deleteModal.rate.id);
                        deleteModal = { show: false, rate: null };
                }
        }
        
        function openDeleteModal(rate: Rate) {
                deleteModal = { show: true, rate };
                editModal = { show: false, rate: null };
        }
        
        function closeEditModal() {
                editModal = { show: false, rate: null };
        }
        
        // Long press action
        function longpressAction(node: HTMLElement, rate: Rate) {
                let currentRate = rate;
                let timeoutId: ReturnType<typeof setTimeout>;
                
                function startPress(e: TouchEvent | MouseEvent) {
                        e.preventDefault();
                        timeoutId = setTimeout(() => {
                                node.classList.add('long-pressing');
                                handleLongPress(currentRate);
                        }, 500);
                }
                
                function endPress() {
                        clearTimeout(timeoutId);
                        node.classList.remove('long-pressing');
                }
                
                node.addEventListener('touchstart', startPress, { passive: false });
                node.addEventListener('touchend', endPress);
                node.addEventListener('touchmove', endPress);
                node.addEventListener('mousedown', startPress);
                node.addEventListener('mouseup', endPress);
                node.addEventListener('mouseleave', endPress);
                
                return {
                        update(newRate: Rate) {
                                currentRate = newRate;
                        },
                        destroy() {
                                node.removeEventListener('touchstart', startPress as EventListener);
                                node.removeEventListener('touchend', endPress);
                                node.removeEventListener('touchmove', endPress);
                                node.removeEventListener('mousedown', startPress as EventListener);
                                node.removeEventListener('mouseup', endPress);
                                node.removeEventListener('mouseleave', endPress);
                        }
                };
        }
</script>

<svelte:head>
        <title>WeldTrack - Нормы</title>
</svelte:head>

<div class="page-container">
        <!-- Fixed Header -->
        <header class="fixed-header">
                <div class="header-content">
                        <h1>Нормы времени</h1>
                        <div class="input-row">
                                <div class="input-wrapper">
                                        <input 
                                                type="text"
                                                class="input-field article-input"
                                                placeholder="Артикул"
                                                bind:value={articleInput}
                                                onfocus={handleArticleFocus}
                                                onblur={handleArticleBlur}
                                                onkeydown={handleArticleKeyDown}
                                                autocomplete="off"
                                                autocapitalize="characters"
                                        />
                                        {#if suggestionsAvailable}
                                                <div class="suggestion-dropdown">
                                                        {#each filteredSuggestions as article, i (article)}
                                                                <div 
                                                                        class="suggestion-item"
                                                                        class:highlighted={i === highlightedIndex}
                                                                        onclick={() => selectSuggestion(article)}
                                                                >
                                                                        <span class="article-badge">{article}</span>
                                                                </div>
                                                        {/each}
                                                </div>
                                        {/if}
                                </div>
                                <div class="input-divider">|</div>
                                <input 
                                        type="text"
                                        class="input-field norm-input"
                                        placeholder="Норма (ч)"
                                        bind:value={normInput}
                                        onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
                                        inputmode="decimal"
                                        autocomplete="off"
                                />
                                <button class="btn btn-primary add-btn" onclick={handleSubmit}>
                                        Добавить
                                </button>
                        </div>
                </div>
        </header>
        
        <!-- Scrollable Content -->
        <div class="scrollable-content page-content">
                {#if $rates.length === 0}
                        <div class="empty-state">
                                <div class="empty-state-icon">⏱️</div>
                                <div class="empty-state-text">
                                        Нет норм времени.<br/>
                                        Добавьте первую норму выше.
                                </div>
                        </div>
                {:else}
                        <div class="rate-list">
                                {#each $rates as rate (rate.id)}
                                        <div 
                                                class="rate-item"
                                                use:longpressAction={rate}
                                        >
                                                <span class="article-badge">{rate.article}</span>
                                                <span class="dotted-line"></span>
                                                <span class="rate-value">{formatQty(rate.norm)} ч</span>
                                        </div>
                                {/each}
                        </div>
                {/if}
        </div>
</div>

<!-- Edit Modal -->
{#if editModal.show && editModal.rate}
<div class="modal-overlay" onclick={closeEditModal}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
                <h2 class="modal-title">Редактировать норму</h2>
                <div class="modal-body">
                        <div class="form-group">
                                <label>Артикул</label>
                                <input 
                                        type="text"
                                        class="input-field"
                                        bind:value={editArticleInput}
                                        autocomplete="off"
                                        autocapitalize="characters"
                                />
                        </div>
                        <div class="form-group">
                                <label>Норма времени (часов)</label>
                                <input 
                                        type="text"
                                        class="input-field"
                                        bind:value={editNormInput}
                                        inputmode="decimal"
                                        autocomplete="off"
                                />
                        </div>
                </div>
                <div class="modal-actions">
                        <button class="btn btn-danger" onclick={() => openDeleteModal(editModal.rate!)}>
                                Удалить
                        </button>
                        <button class="btn btn-secondary" onclick={closeEditModal}>
                                Отмена
                        </button>
                        <button class="btn btn-primary" onclick={handleEditSubmit}>
                                Сохранить
                        </button>
                </div>
        </div>
</div>
{/if}

<style>
        .page-container {
                min-height: 100vh;
                min-height: 100dvh;
                display: flex;
                flex-direction: column;
        }
        
        .header-content {
                padding: 1rem;
        }
        
        .header-content h1 {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--color-text-primary);
                margin-bottom: 1rem;
        }
        
        .input-row {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex-wrap: wrap;
        }
        
        .input-wrapper {
                position: relative;
                flex: 1;
                min-width: 100px;
        }
        
        .article-input {
                text-transform: uppercase;
        }
        
        .input-divider {
                color: var(--color-text-muted);
                font-weight: 600;
        }
        
        .norm-input {
                width: 100px;
                text-align: center;
        }
        
        .add-btn {
                flex-shrink: 0;
        }
        
        .highlighted {
                background-color: var(--color-bg-tertiary);
        }
        
        .rate-list {
                padding: 0.5rem;
        }
        
        .rate-item {
                display: flex;
                align-items: center;
                padding: 1rem;
                background: var(--color-bg-secondary);
                border-radius: 0.75rem;
                margin-bottom: 0.5rem;
                cursor: pointer;
                transition: all 0.2s ease;
                min-height: 56px;
        }
        
        .rate-item:active {
                transform: scale(0.99);
        }
        
        .rate-value {
                font-size: 1rem;
                font-weight: 600;
                color: var(--color-text-primary);
                font-family: 'Courier New', monospace;
                white-space: nowrap;
        }
        
        .modal-title {
                font-size: 1.25rem;
                font-weight: 700;
                color: var(--color-text-primary);
                margin-bottom: 1rem;
        }
        
        .modal-body {
                padding: 0.5rem 0 1rem;
        }
        
        .form-group {
                margin-bottom: 1rem;
        }
        
        .form-group label {
                display: block;
                font-size: 0.875rem;
                color: var(--color-text-secondary);
                margin-bottom: 0.5rem;
        }
        
        .modal-actions {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
        }
        
        .modal-actions .btn {
                flex: 1;
                min-width: 80px;
        }
</style>
