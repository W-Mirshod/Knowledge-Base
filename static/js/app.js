const API_BASE = window.location.origin;

// Global state
let currentNotes = [];
let currentCategories = [];

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const totalNotesEl = document.getElementById('total-notes');
const totalCategoriesEl = document.getElementById('total-categories');

// Utility functions
function showMessage(message, type = 'success') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `${type}-message`;
    msgDiv.textContent = message;
    document.querySelector('.container').insertBefore(msgDiv, document.querySelector('main'));
    setTimeout(() => msgDiv.remove(), 5000);
}

function hideElement(element) { element.classList.add('hidden'); }
function showElement(element) { element.classList.remove('hidden'); }

// Stats
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/stats`);
        if (response.ok) {
            const stats = await response.json();
            totalNotesEl.textContent = `${stats.total_notes} notes`;
            totalCategoriesEl.textContent = `${stats.total_categories} categories`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/api/categories`);
        if (response.ok) {
            const data = await response.json();
            currentCategories = data.categories;
            updateCategorySelects();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function updateCategorySelects() {
    const selects = ['note-category', 'category-filter'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Clear existing options except first
        const firstOption = select.querySelector('option');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);

        currentCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    });
}

// Notes
function showNoteForm() {
    showElement(document.getElementById('note-form'));
    document.getElementById('add-note-btn').classList.add('hidden');
}

function hideNoteForm() {
    hideElement(document.getElementById('note-form'));
    document.getElementById('add-note-btn').classList.remove('hidden');
    document.getElementById('create-note-form').reset();
}

async function createNote(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const noteData = {
        title: formData.get('note-title'),
        content: document.getElementById('note-content').value,
        category: document.getElementById('note-category').value,
        tags: document.getElementById('note-tags').value || null
    };

    try {
        const response = await fetch(`${API_BASE}/api/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });

        if (!response.ok) throw new Error('Failed to create note');

        showMessage('Note created successfully!');
        hideNoteForm();
        loadNotes();
        loadStats();
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

async function loadNotes(category = 'all') {
    const container = document.getElementById('notes-container');
    const loading = document.getElementById('notes-loading');
    const empty = document.getElementById('notes-empty');

    try {
        showElement(loading);
        hideElement(empty);

        const url = category === 'all' ? `${API_BASE}/api/notes` : `${API_BASE}/api/notes?category=${category}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load notes');

        const data = await response.json();
        hideElement(loading);

        if (data.notes.length === 0) {
            showElement(empty);
            container.innerHTML = '<div id="notes-loading" class="loading">Loading notes...</div><div id="notes-empty" class="empty-state hidden"><p>No notes yet. Create your first note!</p></div>';
            return;
        }

        displayNotes(data.notes);
    } catch (error) {
        hideElement(loading);
        showMessage('Failed to load notes', 'error');
    }
}

function displayNotes(notes) {
    const container = document.getElementById('notes-container');
    container.innerHTML = '<div id="notes-loading" class="loading">Loading notes...</div><div id="notes-empty" class="empty-state hidden"><p>No notes yet. Create your first note!</p></div>';

    const grid = document.createElement('div');
    grid.className = 'notes-grid';

    notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.onclick = () => showNoteModal(note);

        noteCard.innerHTML = `
            <div class="note-title">${note.title}</div>
            <div class="note-summary">${note.summary || note.content.substring(0, 150) + '...'}</div>
            <div class="note-meta">
                <span class="note-category">${note.category}</span>
                <span>${new Date(note.updated_at).toLocaleDateString()}</span>
            </div>
        `;

        grid.appendChild(noteCard);
    });

    container.appendChild(grid);
}

// Search
async function searchNotes() {
    const query = searchInput.value.trim();
    if (!query) {
        loadNotes();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        displayNotes(data.notes);
    } catch (error) {
        showMessage('Search failed', 'error');
    }
}

// Modal
function showNoteModal(note) {
    const modal = document.getElementById('note-modal');
    const title = document.getElementById('note-modal-title');
    const content = document.getElementById('note-modal-content');
    const meta = document.getElementById('note-modal-meta');

    title.textContent = note.title;
    content.innerHTML = `<div style="white-space: pre-wrap;">${note.content}</div>`;
    meta.innerHTML = `
        <div>Category: <span class="note-category">${note.category}</span></div>
        ${note.tags ? `<div>Tags: ${note.tags}</div>` : ''}
        <div>Created: ${new Date(note.created_at).toLocaleDateString()}</div>
        <div>Updated: ${new Date(note.updated_at).toLocaleDateString()}</div>
    `;

    showElement(modal);
}

function closeNoteModal() {
    hideElement(document.getElementById('note-modal'));
}

// Event listeners
document.getElementById('create-note-form').addEventListener('submit', createNote);
searchBtn.addEventListener('click', searchNotes);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchNotes();
});

document.getElementById('category-filter').addEventListener('change', (e) => {
    loadNotes(e.target.value);
});

document.getElementById('show-favorites-btn').addEventListener('click', () => {
    // Load favorites - would need to implement this endpoint
    showMessage('Favorites feature coming soon!');
});

// Initialize
async function init() {
    await Promise.all([
        loadStats(),
        loadCategories(),
        loadNotes()
    ]);
}

init();
