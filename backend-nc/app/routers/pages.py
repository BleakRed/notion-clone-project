from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Page

router = APIRouter(prefix="/pages")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def create_page(title: str, user_id: str, db: Session = Depends(get_db)):
    page = Page(
        title=title,
        user_id=user_id,
        content_md=""
    )
    db.add(page)
    db.commit()
    return page

@router.get("/{page_id}")
def get_page(page_id: str, db: Session = Depends(get_db)):
    return db.query(Page).get(page_id)

@router.put("/{page_id}")
def save_page(page_id: str, content_md: str, db: Session = Depends(get_db)):
    page = db.query(Page).get(page_id)
    page.content_md = content_md
    db.commit()
    return {"status": "saved"}
