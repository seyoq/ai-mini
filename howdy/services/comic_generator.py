import uuid
import os
from PIL import Image
from services.gpt_scripting import get_script
from services.text_overlay import add_text_boxes_to_combined_image
from models.request_model import DiaryRequest
from services.gpt_scripting import translate_text_to_korean

def build_combined_prompt(scenes: list, user_name: str, gender: str) -> str:
    ...
    # 기존 build_combined_prompt
    ...

def generate_combined_image(prompt: str, max_retries: int = 3) -> Image.Image:
    ...
    # 기존 generate_combined_image
    ...

def generate_comic(req: DiaryRequest):
    scenes = get_script(req.user_name, req.diary_text, req.gender)
    prompt = build_combined_prompt(scenes, req.user_name, req.gender)
    comic_img = generate_combined_image(prompt)
    comic_img = add_text_boxes_to_combined_image(comic_img, scenes, font_path=req.font_path)

    filename = f"comic_{uuid.uuid4().hex[:8]}.png"
    output_path = os.path.join("outputs", filename)
    os.makedirs("outputs", exist_ok=True)
    comic_img.save(output_path)

    return {"filename": filename, "path": output_path}
