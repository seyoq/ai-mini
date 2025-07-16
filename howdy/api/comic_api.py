from fastapi import APIRouter
from models.request_model import DiaryRequest
from services.comic_generator import generate_comic

router = APIRouter()

@router.post("/generate-comic")
def generate_comic_route(req: DiaryRequest):
    return generate_comic(req)
