from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class NoteBase(BaseModel):
    title: str
    content: str
    summary: Optional[str] = None
    category: str = "general"
    tags: Optional[str] = None
    is_favorite: bool = False
    is_public: bool = False

class NoteCreate(NoteBase):
    pass

class Note(NoteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class NoteList(BaseModel):
    notes: List[Note]
    total: int

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#6366f1"

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CategoryList(BaseModel):
    categories: List[Category]
    total: int

class SearchResult(BaseModel):
    notes: List[Note]
    total: int
    query: str

class Stats(BaseModel):
    total_notes: int
    total_categories: int
    favorite_notes: int
    recent_notes: int
