from fastapi import FastAPI
from database import Base, engine
from routers import auth, pages

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth.router)
app.include_router(pages.router)
