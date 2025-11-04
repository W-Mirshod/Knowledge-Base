const API_BASE = window.location.origin;

// Global state
let currentNotes = [];
let currentCategories = [];
let currentNoteId = null;
let isEditing = false;
let isFavoriteView = false;

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const totalNotesEl = document.getElementById('total-notes');
const totalCategoriesEl = document.getElementById('total-categories');
const notesContainer = document.getElementById('notes-container');
const notesLoading = document.getElementById('notes-loading');
const notesEmpty = document.getElementById('notes-empty');
const toastContainer = document.getElementById('toast-container');

// Toast Notification System
function showToast(message, type = 'success', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    
    const iconMap = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${iconMap[type] || 'ℹ'}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" aria-label="Close notification" onclick="this.parentElement.remove()">×</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
    
    // Add slide-out animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    if (!document.getElementById('toast-animations')) {
        style.id = 'toast-animations';
        document.head.appendChild(style);
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(message, type = 'success') {
    // Legacy support - use toast system
    showToast(message, type);
}

function hideElement(element) { 
    if (element) element.classList.add('hidden'); 
}

function showElement(element) { 
    if (element) element.classList.remove('hidden'); 
}

function setLoading(element, isLoading) {
    if (!element) return;
    if (isLoading) {
        element.classList.add('loading');
        element.setAttribute('aria-busy', 'true');
    } else {
        element.classList.remove('loading');
        element.setAttribute('aria-busy', 'false');
    }
}

// Stats
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/stats`);
        if (response.ok) {
            const stats = await response.json();
            totalNotesEl.textContent = `${stats.total_notes} ${stats.total_notes === 1 ? 'note' : 'notes'}`;
            totalCategoriesEl.textContent = `${stats.total_categories} ${stats.total_categories === 1 ? 'category' : 'categories'}`;
        } else {
            throw new Error('Failed to load stats');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        totalNotesEl.textContent = '0 notes';
        totalCategoriesEl.textContent = '0 categories';
    }
}

// Categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/api/categories`);
        if (response.ok) {
            const data = await response.json();
            currentCategories = data.categories || [];
            updateCategorySelects();
        } else {
            throw new Error('Failed to load categories');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('Failed to load categories', 'error');
    }
}

function updateCategorySelects() {
    const selects = ['note-category', 'category-filter'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const isFilter = selectId === 'category-filter';
        const firstOption = select.querySelector('option');
        
        // Clear existing options
        select.innerHTML = '';
        
        if (isFilter) {
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Categories';
            select.appendChild(allOption);
        } else {
            const generalOption = document.createElement('option');
            generalOption.value = 'general';
            generalOption.textContent = 'General';
            select.appendChild(generalOption);
        }

        currentCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    });
}

async function createCategory() {
    const name = prompt('Enter category name:');
    if (!name || !name.trim()) return;

    try {
        const response = await fetch(`${API_BASE}/api/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create category');
        }

        showToast('Category created successfully!', 'success');
        await loadCategories();
        loadStats();
    } catch (error) {
        showToast(error.message || 'Failed to create category', 'error');
    }
}

// Notes
function showNoteForm(note = null) {
    const form = document.getElementById('note-form');
    const formTitle = document.getElementById('note-form-title');
    const titleInput = document.getElementById('note-title');
    const contentInput = document.getElementById('note-content');
    const categorySelect = document.getElementById('note-category');
    const tagsInput = document.getElementById('note-tags');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (note) {
        // Edit mode
        isEditing = true;
        currentNoteId = note.id;
        formTitle.textContent = 'Edit Note';
        titleInput.value = note.title;
        contentInput.value = note.content;
        categorySelect.value = note.category;
        tagsInput.value = note.tags || '';
        submitBtn.textContent = 'Update Note';
        form.setAttribute('aria-label', 'Edit note');
    } else {
        // Create mode
        isEditing = false;
        currentNoteId = null;
        formTitle.textContent = 'Create New Note';
        form.querySelector('form').reset();
        submitBtn.textContent = 'Save Note';
        form.setAttribute('aria-label', 'Create new note');
    }
    
    showElement(form);
    hideElement(document.getElementById('add-note-btn'));
    titleInput.focus();
    
    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideNoteForm() {
    const form = document.getElementById('note-form');
    if (!form) return;
    
    hideElement(form);
    showElement(document.getElementById('add-note-btn'));
    form.querySelector('form').reset();
    isEditing = false;
    currentNoteId = null;
    
    // Clear validation errors
    const errors = form.querySelectorAll('[role="alert"]');
    errors.forEach(el => {
        el.textContent = '';
        el.classList.add('sr-only');
    });
    
    // Clear invalid classes
    const inputs = form.querySelectorAll('input.invalid, textarea.invalid');
    inputs.forEach(el => el.classList.remove('invalid'));
}

// Make functions globally accessible
window.hideNoteForm = hideNoteForm;
window.showNoteForm = showNoteForm;

function validateForm(form) {
    let isValid = true;
    const titleInput = document.getElementById('note-title');
    const contentInput = document.getElementById('note-content');
    const titleError = document.getElementById('note-title-error');
    const contentError = document.getElementById('note-content-error');
    
    // Clear previous errors
    titleError.textContent = '';
    contentError.textContent = '';
    titleInput.setCustomValidity('');
    contentInput.setCustomValidity('');
    
    // Validate title
    if (!titleInput.value.trim()) {
        titleError.textContent = 'Title is required';
        titleError.classList.remove('sr-only');
        titleInput.setCustomValidity('Title is required');
        titleInput.classList.add('invalid');
        isValid = false;
    } else if (titleInput.value.trim().length < 3) {
        titleError.textContent = 'Title must be at least 3 characters';
        titleError.classList.remove('sr-only');
        titleInput.setCustomValidity('Title must be at least 3 characters');
        titleInput.classList.add('invalid');
        isValid = false;
    } else {
        titleInput.classList.remove('invalid');
        titleError.classList.add('sr-only');
        titleError.textContent = '';
    }
    
    // Validate content
    if (!contentInput.value.trim()) {
        contentError.textContent = 'Content is required';
        contentError.classList.remove('sr-only');
        contentInput.setCustomValidity('Content is required');
        contentInput.classList.add('invalid');
        isValid = false;
    } else if (contentInput.value.trim().length < 10) {
        contentError.textContent = 'Content must be at least 10 characters';
        contentError.classList.remove('sr-only');
        contentInput.setCustomValidity('Content must be at least 10 characters');
        contentInput.classList.add('invalid');
        isValid = false;
    } else {
        contentInput.classList.remove('invalid');
        contentError.classList.add('sr-only');
        contentError.textContent = '';
    }
    
    return isValid;
}

async function createNote(event) {
    event.preventDefault();
    
    if (!validateForm(event.target)) {
        showToast('Please fix the form errors', 'error');
        return;
    }
    
    const formData = new FormData(event.target);
    const noteData = {
        title: formData.get('note-title').trim(),
        content: document.getElementById('note-content').value.trim(),
        category: document.getElementById('note-category').value,
        tags: document.getElementById('note-tags').value.trim() || null
    };
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = isEditing ? 'Updating...' : 'Saving...';
        
        const url = isEditing 
            ? `${API_BASE}/api/notes/${currentNoteId}`
            : `${API_BASE}/api/notes`;
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save note');
        }

        showToast(
            isEditing ? 'Note updated successfully!' : 'Note created successfully!',
            'success'
        );
        hideNoteForm();
        loadNotes();
        loadStats();
    } catch (error) {
        showToast(error.message || 'Failed to save note', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function loadNotes(category = 'all') {
    if (!notesContainer) return;
    
    try {
        showElement(notesLoading);
        hideElement(notesEmpty);
        setLoading(notesLoading, true);
        
        let url;
        if (isFavoriteView) {
            url = `${API_BASE}/api/notes/favorites`;
        } else if (category === 'all') {
            url = `${API_BASE}/api/notes`;
        } else {
            url = `${API_BASE}/api/notes?category=${encodeURIComponent(category)}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to load notes');
        }

        const data = await response.json();
        currentNotes = data.notes || [];
        setLoading(notesLoading, false);
        hideElement(notesLoading);

        if (currentNotes.length === 0) {
            showElement(notesEmpty);
            displayNotes([]);
        } else {
            hideElement(notesEmpty);
            displayNotes(currentNotes);
        }
    } catch (error) {
        setLoading(notesLoading, false);
        hideElement(notesLoading);
        showToast('Failed to load notes', 'error');
        console.error('Error loading notes:', error);
    }
}

function displayNotes(notes) {
    if (!notesContainer) return;
    
    // Clear existing notes grid
    const existingGrid = notesContainer.querySelector('.notes-grid');
    if (existingGrid) {
        existingGrid.remove();
    }
    
    if (notes.length === 0) {
        return;
    }
    
    const grid = document.createElement('div');
    grid.className = 'notes-grid';
    
    notes.forEach(note => {
        const noteCard = createNoteCard(note);
        grid.appendChild(noteCard);
    });
    
    notesContainer.appendChild(grid);
}

function createNoteCard(note) {
    const noteCard = document.createElement('article');
    noteCard.className = 'note-card';
    noteCard.setAttribute('role', 'button');
    noteCard.setAttribute('tabindex', '0');
    noteCard.setAttribute('aria-label', `Note: ${escapeHtml(note.title)}`);
    
    const summary = note.summary || note.content.substring(0, 150);
    const truncatedSummary = note.content.length > 150 ? summary + '...' : summary;
    
    const updatedDate = note.updated_at ? new Date(note.updated_at).toLocaleDateString() : 'N/A';
    noteCard.innerHTML = `
        <div class="note-title">${escapeHtml(note.title)}</div>
        <div class="note-summary">${escapeHtml(truncatedSummary)}</div>
        <div class="note-meta">
            <span class="note-category">${escapeHtml(note.category)}</span>
            <span>${updatedDate}</span>
        </div>
    `;
    
    // Click handler
    const handleClick = () => showNoteModal(note);
    noteCard.addEventListener('click', handleClick);
    noteCard.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    });
    
    return noteCard;
}

// Search
async function searchNotes() {
    const query = searchInput.value.trim();
    
    if (!query) {
        loadNotes();
        return;
    }

    try {
        showElement(notesLoading);
        hideElement(notesEmpty);
        setLoading(notesLoading, true);
        
        const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Search failed');
        }

        const data = await response.json();
        setLoading(notesLoading, false);
        hideElement(notesLoading);
        
        if (data.notes.length === 0) {
            showElement(notesEmpty);
            notesEmpty.querySelector('p').textContent = `No notes found for "${query}"`;
            displayNotes([]);
        } else {
            hideElement(notesEmpty);
            displayNotes(data.notes);
            showToast(`Found ${data.notes.length} ${data.notes.length === 1 ? 'note' : 'notes'}`, 'info', 2000);
        }
    } catch (error) {
        setLoading(notesLoading, false);
        hideElement(notesLoading);
        showToast('Search failed', 'error');
        console.error('Search error:', error);
    }
}

// Modal
function showNoteModal(note) {
    const modal = document.getElementById('note-modal');
    const title = document.getElementById('note-modal-title');
    const content = document.getElementById('note-modal-content');
    const meta = document.getElementById('note-modal-meta');
    const favoriteBtn = document.getElementById('favorite-note-btn');
    const favoriteBtnText = document.getElementById('favorite-btn-text');
    
    if (!modal || !note) return;
    
    title.textContent = note.title;
    content.innerHTML = `<div style="white-space: pre-wrap; line-height: 1.8;">${escapeHtml(note.content)}</div>`;
    
    const updatedDate = note.updated_at ? new Date(note.updated_at).toLocaleString() : 'N/A';
    const createdDate = note.created_at ? new Date(note.created_at).toLocaleString() : 'N/A';
    meta.innerHTML = `
        <div><strong>Category:</strong> <span class="note-category">${escapeHtml(note.category)}</span></div>
        ${note.tags ? `<div><strong>Tags:</strong> ${escapeHtml(note.tags)}</div>` : ''}
        <div><strong>Created:</strong> ${createdDate}</div>
        <div><strong>Updated:</strong> ${updatedDate}</div>
    `;
    
    // Update favorite button
    favoriteBtnText.textContent = note.is_favorite ? 'Unfavorite' : 'Favorite';
    favoriteBtn.setAttribute('aria-label', note.is_favorite ? 'Remove from favorites' : 'Add to favorites');
    
    currentNoteId = note.id;
    
    showElement(modal);
    
    // Focus trap
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    };
    
    modal.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    // Cleanup on close
    const cleanup = () => {
        modal.removeEventListener('keydown', handleTabKey);
        modal.removeEventListener('click', handleBackdropClick);
    };
    
    const handleBackdropClick = (e) => {
        if (e.target === modal) {
            closeNoteModal();
            cleanup();
        }
    };
    
    modal.addEventListener('click', handleBackdropClick);
    
    // Store cleanup function
    modal._cleanup = cleanup;
}

function closeNoteModal() {
    const modal = document.getElementById('note-modal');
    if (!modal) return;
    
    if (modal._cleanup) {
        modal._cleanup();
    }
    
    hideElement(modal);
    currentNoteId = null;
}

// Make closeNoteModal globally accessible
window.closeNoteModal = closeNoteModal;

async function editNote() {
    if (!currentNoteId) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/notes/${currentNoteId}`);
        if (!response.ok) {
            throw new Error('Failed to load note');
        }
        
        const note = await response.json();
        closeNoteModal();
        showNoteForm(note);
    } catch (error) {
        showToast('Failed to load note for editing', 'error');
    }
}

async function toggleFavorite() {
    if (!currentNoteId) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/notes/${currentNoteId}/favorite`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to update favorite status');
        }
        
        const data = await response.json();
        showToast(
            data.is_favorite ? 'Added to favorites' : 'Removed from favorites',
            'success'
        );
        loadNotes();
        closeNoteModal();
    } catch (error) {
        showToast('Failed to update favorite status', 'error');
    }
}

async function deleteNote() {
    if (!currentNoteId) return;
    
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/notes/${currentNoteId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete note');
        }
        
        showToast('Note deleted successfully', 'success');
        closeNoteModal();
        loadNotes();
        loadStats();
    } catch (error) {
        showToast('Failed to delete note', 'error');
    }
}

function showFavorites() {
    isFavoriteView = !isFavoriteView;
    const btn = document.getElementById('show-favorites-btn');
    
    if (isFavoriteView) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        loadNotes();
    } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
        loadNotes();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Form submission
    const createNoteForm = document.getElementById('create-note-form');
    if (createNoteForm) {
        createNoteForm.addEventListener('submit', createNote);
    }
    
    // Search
    if (searchBtn) {
        searchBtn.addEventListener('click', searchNotes);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchNotes();
            }
        });
        
        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim() === '') {
                loadNotes();
            }
        });
    }
    
    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            isFavoriteView = false;
            document.getElementById('show-favorites-btn')?.classList.remove('active');
            loadNotes(e.target.value);
        });
    }
    
    // Buttons
    const addNoteBtn = document.getElementById('add-note-btn');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', () => showNoteForm());
    }
    
    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', createCategory);
    }
    
    const showFavoritesBtn = document.getElementById('show-favorites-btn');
    if (showFavoritesBtn) {
        showFavoritesBtn.addEventListener('click', showFavorites);
    }
    
    // Modal buttons
    const editNoteBtn = document.getElementById('edit-note-btn');
    if (editNoteBtn) {
        editNoteBtn.addEventListener('click', editNote);
    }
    
    const favoriteNoteBtn = document.getElementById('favorite-note-btn');
    if (favoriteNoteBtn) {
        favoriteNoteBtn.addEventListener('click', toggleFavorite);
    }
    
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    if (deleteNoteBtn) {
        deleteNoteBtn.addEventListener('click', deleteNote);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape to close modal
        if (e.key === 'Escape') {
            const modal = document.getElementById('note-modal');
            if (modal && !modal.classList.contains('hidden')) {
                closeNoteModal();
            }
            
            const form = document.getElementById('note-form');
            if (form && !form.classList.contains('hidden')) {
                hideNoteForm();
            }
        }
        
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput?.focus();
        }
        
        // Ctrl/Cmd + N to create new note
        if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
            e.preventDefault();
            if (!document.getElementById('note-form').classList.contains('hidden')) {
                return;
            }
            showNoteForm();
        }
    });
    
    // Initialize
    init();
});

// Initialize
async function init() {
    try {
        await Promise.all([
            loadStats(),
            loadCategories(),
            loadNotes()
        ]);
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize application', 'error');
    }
}
