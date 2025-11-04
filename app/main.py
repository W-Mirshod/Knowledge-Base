from fastapi import FastAPI, Depends, HTTPException, Request, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from starlette.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import List, Optional
from . import database, models, schemas, crud

app = FastAPI(title="Knowledge Base")

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the main page."""
    return templates.TemplateResponse("index.html", {"request": request})

# Dashboard
@app.get("/api/stats")
async def get_stats(db: Session = Depends(database.get_db)):
    """Get knowledge base statistics."""
    return crud.get_stats(db)

# Note endpoints
@app.post("/api/notes", response_model=schemas.Note)
async def create_note(note: schemas.NoteCreate, db: Session = Depends(database.get_db)):
    """Create a new note."""
    # Generate summary if not provided
    if not note.summary and note.content:
        note.summary = crud.generate_summary(note.content)

    return crud.create_note(db, note)

@app.get("/api/notes", response_model=schemas.NoteList)
async def get_notes(
    category: str = "all",
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    """Get all notes, optionally filtered by category."""
    notes = crud.get_notes(db, skip=skip, limit=limit, category=category)
    return {"notes": notes, "total": len(notes)}

@app.get("/api/notes/favorites", response_model=schemas.NoteList)
async def get_favorite_notes(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """Get favorite notes."""
    notes = crud.get_favorite_notes(db, skip=skip, limit=limit)
    return {"notes": notes, "total": len(notes)}

@app.get("/api/notes/{note_id}", response_model=schemas.Note)
async def get_note(note_id: int, db: Session = Depends(database.get_db)):
    """Get a specific note."""
    note = crud.get_note_by_id(db, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@app.put("/api/notes/{note_id}", response_model=schemas.Note)
async def update_note(note_id: int, note: schemas.NoteCreate, db: Session = Depends(database.get_db)):
    """Update a note."""
    if not note.summary and note.content:
        note.summary = crud.generate_summary(note.content)

    db_note = crud.update_note(db, note_id, note)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return db_note

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: int, db: Session = Depends(database.get_db)):
    """Delete a note."""
    db_note = crud.delete_note(db, note_id)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted successfully"}

@app.post("/api/notes/{note_id}/favorite")
async def toggle_favorite(note_id: int, db: Session = Depends(database.get_db)):
    """Toggle favorite status of a note."""
    note = crud.toggle_favorite(db, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Favorite status updated", "is_favorite": note.is_favorite}

# Category endpoints
@app.post("/api/categories", response_model=schemas.Category)
async def create_category(category: schemas.CategoryCreate, db: Session = Depends(database.get_db)):
    """Create a new category."""
    # Check if category name already exists
    existing = db.query(models.Category).filter(models.Category.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")

    return crud.create_category(db, category)

@app.get("/api/categories", response_model=schemas.CategoryList)
async def get_categories(db: Session = Depends(database.get_db)):
    """Get all categories."""
    categories = crud.get_categories(db)
    return {"categories": categories, "total": len(categories)}

@app.put("/api/categories/{category_id}", response_model=schemas.Category)
async def update_category(category_id: int, category: schemas.CategoryCreate, db: Session = Depends(database.get_db)):
    """Update a category."""
    db_category = crud.update_category(db, category_id, category)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category

@app.delete("/api/categories/{category_id}")
async def delete_category(category_id: int, db: Session = Depends(database.get_db)):
    """Delete a category."""
    db_category = crud.delete_category(db, category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# Search endpoint
@app.get("/api/search", response_model=schemas.SearchResult)
async def search_notes(
    q: str = Query(..., description="Search query"),
    category: str = "all",
    tags: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Search notes by content, title, or tags."""
    if not q.strip():
        return {"notes": [], "total": 0, "query": q}

    notes = crud.search_notes(db, q, category, tags)
    return {"notes": notes, "total": len(notes), "query": q}
