from pydantic import BaseModel

class DiaryRequest(BaseModel):
    diary_text: str
    font_path: str = "NanumGothic.ttf"
    user_name: str = "나"
    gender: str = "female"
