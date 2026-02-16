<script lang="ts">
        import { welders, addWelder, exportData, importData, deleteWelder } from '$lib/stores';
        import { getTodaySummary, getAllTimeSummary, getTodayISO } from '$lib/utils';
        import { goto } from '$app/navigation';
        import type { Welder } from '$lib/types';
        
        let newWelderName = $state('');
        let today = getTodayISO();
        let infoModalWelder: Welder | null = $state(null);
        let deleteConfirmWelder: Welder | null = $state(null);
        
        function longpressAction(node: HTMLElement, callback: () => void) {
                let timeoutId: ReturnType<typeof setTimeout>;
                
                function startPress(e: TouchEvent | MouseEvent) {
                        e.preventDefault();
                        timeoutId = setTimeout(() => {
                                node.classList.add('long-pressing');
                                callback();
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
                        update(newCallback: () => void) {
                                callback = newCallback;
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
        
        function handleAddWelder() {
                if (newWelderName.trim()) {
                        const success = addWelder(newWelderName.trim());
                        if (success) {
                                newWelderName = '';
                        } else {
                                alert('Сварщик с такой фамилией уже существует');
                        }
                }
        }
        
        function handleKeyDown(e: KeyboardEvent) {
                if (e.key === 'Enter') {
                        handleAddWelder();
                }
        }
        
        function handleExport() {
                const data = exportData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `weldtrack-export-${today}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
        }
        
        function handleImport() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        
                        try {
                                const text = await file.text();
                                const data = JSON.parse(text);
                                importData(data);
                                alert('Данные успешно импортированы');
                        } catch (err) {
                                alert('Ошибка при импорте файла');
                        }
                };
                input.click();
        }
        
        function showInfoModal(welder: Welder) {
                infoModalWelder = welder;
        }
        
        function closeInfoModal() {
                infoModalWelder = null;
        }
        
        function navigateToWelder(welderId: string) {
                goto(`/wc/${welderId}`);
        }
        
        function confirmDeleteWelder(welder: Welder) {
                deleteConfirmWelder = welder;
        }
        
        function handleDeleteWelder() {
                if (deleteConfirmWelder) {
                        deleteWelder(deleteConfirmWelder.id);
                        deleteConfirmWelder = null;
                }
        }
</script>

<svelte:head>
        <title>WeldTrack - Главная</title>
</svelte:head>

<div class="page-container">
        <!-- Fixed Header -->
        <header class="fixed-header">
                <div class="header-content">
                        <h1>Сварщики</h1>
                        
                        <!-- Import/Export buttons - small, top right style -->
                        <div class="action-buttons">
                                <button class="btn-small" onclick={handleImport}>📥 Импорт</button>
                                <button class="btn-small" onclick={handleExport}>📤 Экспорт</button>
                        </div>
                        
                        <!-- Add welder input -->
                        <div class="input-group">
                                <input 
                                        type="text" 
                                        class="input-field"
                                        placeholder="Фамилия"
                                        bind:value={newWelderName}
                                        onkeydown={handleKeyDown}
                                        autocomplete="off"
                                />
                                <button class="btn btn-primary" onclick={handleAddWelder}>
                                        Добавить
                                </button>
                        </div>
                </div>
        </header>
        
        <!-- Scrollable Content -->
        <div class="scrollable-content page-content">
                {#if $welders.length === 0}
                        <div class="empty-state">
                                <div class="empty-state-icon">👷</div>
                                <div class="empty-state-text">
                                        Нет сварщиков.<br/>
                                        Добавьте первого сварщика выше.
                                </div>
                        </div>
                {:else}
                        <div class="welder-list">
                                {#each $welders as welder (welder.id)}
                                        {@const summary = getTodaySummary(welder, today)}
                                        <div 
                                                class="welder-item"
                                                onclick={() => navigateToWelder(welder.id)}
                                                use:longpressAction={() => confirmDeleteWelder(welder)}
                                        >
                                                <div class="welder-name">{welder.lastName}</div>
                                                {#if summary}
                                                        <div class="welder-summary">{summary}</div>
                                                {/if}
                                                <button 
                                                        class="info-btn" 
                                                        type="button"
                                                        onclick={(e) => {
                                                                e.stopPropagation();
                                                                showInfoModal(welder);
                                                        }}
                                                >
                                                        ℹ️
                                                </button>
                                        </div>
                                {/each}
                        </div>
                {/if}
        </div>
</div>

<!-- Info Modal -->
{#if infoModalWelder}
<div class="modal-overlay" onclick={closeInfoModal}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
                <h2 class="modal-title">{infoModalWelder.lastName}</h2>
                <div class="modal-body">
                        <div class="info-label">Общий итог:</div>
                        <div class="info-value">{getAllTimeSummary(infoModalWelder) || 'Нет записей'}</div>
                </div>
                <button class="btn btn-secondary w-full" onclick={closeInfoModal}>
                        Закрыть
                </button>
        </div>
</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteConfirmWelder}
<div class="modal-overlay" onclick={() => deleteConfirmWelder = null}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
                <h2 class="modal-title">Подтверждение</h2>
                <div class="modal-body">
                        <p class="confirm-text">Удалить сварщика {deleteConfirmWelder.lastName}?</p>
                        <p class="confirm-warning">Все записи будут потеряны.</p>
                </div>
                <div class="modal-actions">
                        <button class="btn btn-secondary" onclick={() => deleteConfirmWelder = null}>
                                Отмена
                        </button>
                        <button class="btn btn-danger" onclick={handleDeleteWelder}>
                                Удалить
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
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
        }
        
        .header-content h1 {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--color-text-primary);
                margin: 0;
        }
        
        /* Small action buttons */
        .action-buttons {
                display: flex;
                gap: 0.5rem;
        }
        
        .btn-small {
                padding: 0.4rem 0.75rem;
                font-size: 0.8rem;
                background-color: var(--color-bg-tertiary);
                color: var(--color-text-secondary);
                border: 1px solid var(--color-border);
                border-radius: 0.375rem;
                cursor: pointer;
                transition: all 0.2s ease;
                min-height: 32px;
        }
        
        .btn-small:hover {
                background-color: var(--color-bg-secondary);
                border-color: var(--color-accent);
                color: var(--color-text-primary);
        }
        
        .input-group {
                display: flex;
                gap: 0.5rem;
        }
        
        .input-group .input-field {
                flex: 1;
        }
        
        /* More top padding for content */
        .page-content {
                padding-top: 160px;
                padding-bottom: 80px;
        }
        
        .welder-list {
                padding: 0.5rem;
        }
        
        .welder-item {
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
        
        .welder-item:active {
                transform: scale(0.99);
                background: var(--color-bg-tertiary);
        }
        
        .welder-name {
                font-weight: 600;
                color: var(--color-text-primary);
                min-width: 100px;
        }
        
        .welder-summary {
                flex: 1;
                font-size: 0.875rem;
                color: var(--color-text-secondary);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                padding: 0 0.5rem;
        }
        
        .info-btn {
                background: none;
                border: none;
                font-size: 1.25rem;
                cursor: pointer;
                padding: 0.5rem;
                min-width: 44px;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
        }
        
        .modal-overlay {
                position: fixed;
                inset: 0;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: flex-end;
                justify-content: center;
                z-index: 2000;
        }
        
        .modal-content {
                width: 100%;
                max-width: 500px;
                background-color: var(--color-bg-secondary);
                border-radius: 1rem 1rem 0 0;
                padding: 1.5rem;
        }
        
        .modal-title {
                font-size: 1.25rem;
                font-weight: 700;
                color: var(--color-text-primary);
                margin-bottom: 1rem;
        }
        
        .modal-body {
                padding: 1rem 0;
        }
        
        .info-label {
                font-size: 0.875rem;
                color: var(--color-text-secondary);
                margin-bottom: 0.5rem;
        }
        
        .info-value {
                font-size: 1rem;
                color: var(--color-text-primary);
                line-height: 1.6;
        }
        
        .confirm-text {
                font-size: 1rem;
                color: var(--color-text-primary);
                margin-bottom: 0.5rem;
        }
        
        .confirm-warning {
                font-size: 0.875rem;
                color: var(--color-warning);
        }
        
        .modal-actions {
                display: flex;
                gap: 0.5rem;
        }
        
        .modal-actions .btn {
                flex: 1;
        }
        
        .w-full {
                width: 100%;
        }
</style>