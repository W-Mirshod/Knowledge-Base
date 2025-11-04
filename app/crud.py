from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from . import models, schemas
from typing import List
import re

# Note CRUD
def create_note(db: Session, note: schemas.NoteCreate):
    db_note = models.Note(**note.dict())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

def get_notes(db: Session, skip: int = 0, limit: int = 100, category: str = None):
    query = db.query(models.Note)
    if category and category != "all":
        query = query.filter(models.Note.category == category)
    return query.order_by(models.Note.updated_at.desc()).offset(skip).limit(limit).all()

def get_note_by_id(db: Session, note_id: int):
    return db.query(models.Note).filter(models.Note.id == note_id).first()

def get_favorite_notes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Note).filter(models.Note.is_favorite == True).order_by(models.Note.updated_at.desc()).offset(skip).limit(limit).all()

def update_note(db: Session, note_id: int, note_update: schemas.NoteCreate):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if db_note:
        for key, value in note_update.dict().items():
            setattr(db_note, key, value)
        db.commit()
        db.refresh(db_note)
    return db_note

def delete_note(db: Session, note_id: int):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if db_note:
        db.delete(db_note)
        db.commit()
    return db_note

def toggle_favorite(db: Session, note_id: int):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if db_note:
        db_note.is_favorite = not db_note.is_favorite
        db.commit()
        db.refresh(db_note)
    return db_note

# Category CRUD
def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = models.Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def get_categories(db: Session):
    return db.query(models.Category).order_by(models.Category.name).all()

def update_category(db: Session, category_id: int, category_update: schemas.CategoryCreate):
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if db_category:
        for key, value in category_update.dict().items():
            setattr(db_category, key, value)
        db.commit()
        db.refresh(db_category)
    return db_category

def delete_category(db: Session, category_id: int):
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if db_category:
        db.delete(db_category)
        db.commit()
    return db_category

# Search functionality
def search_notes(db: Session, query: str, category: str = None, tags: str = None):
    search_terms = query.lower().split()
    conditions = []

    for term in search_terms:
        conditions.append(or_(
            models.Note.title.ilike(f'%{term}%'),
            models.Note.content.ilike(f'%{term}%'),
            models.Note.summary.ilike(f'%{term}%'),
            models.Note.tags.ilike(f'%{term}%')
        ))

    search_query = db.query(models.Note).filter(and_(*conditions))

    if category and category != "all":
        search_query = search_query.filter(models.Note.category == category)

    if tags:
        tag_conditions = []
        for tag in tags.split(','):
            tag_conditions.append(models.Note.tags.ilike(f'%{tag.strip()}%'))
        search_query = search_query.filter(or_(*tag_conditions))

    results = search_query.order_by(models.Note.updated_at.desc()).all()
    return results

# Statistics
def get_stats(db: Session):
    total_notes = db.query(func.count(models.Note.id)).scalar()
    total_categories = db.query(func.count(models.Category.id)).scalar()
    favorite_notes = db.query(func.count(models.Note.id)).filter(models.Note.is_favorite == True).scalar()

    # Notes from last 7 days
    from datetime import datetime, timedelta
    week_ago = datetime.now() - timedelta(days=7)
    recent_notes = db.query(func.count(models.Note.id)).filter(models.Note.created_at >= week_ago).scalar()

    return schemas.Stats(
        total_notes=total_notes,
        total_categories=total_categories,
        favorite_notes=favorite_notes,
        recent_notes=recent_notes
    )

# Utility functions
def parse_tags(tags_string: str) -> list:
    """Parse comma-separated tags."""
    if not tags_string:
        return []
    return [tag.strip() for tag in tags_string.split(',') if tag.strip()]

def format_tags(tags_list: list) -> str:
    """Format tags list to comma-separated string."""
    return ', '.join(tags_list)

def generate_summary(content: str, max_length: int = 200) -> str:
    """Generate a summary from content."""
    if len(content) <= max_length:
        return content

    # Find the last complete sentence within the limit
    truncated = content[:max_length]
    last_period = truncated.rfind('.')
    last_exclamation = truncated.rfind('!')
    last_question = truncated.rfind('?')

    last_sentence_end = max(last_period, last_exclamation, last_question)

    if last_sentence_end > max_length * 0.7:  # If we can keep most of the content
        return content[:last_sentence_end + 1]
    else:
        return truncated + '...' if len(content) > max_length else truncated
