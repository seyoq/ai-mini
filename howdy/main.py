from fastapi import FastAPI
from models.schema import DiaryRequest
from services.script_generator import get_script, build_combined_prompt
from services.image_generator import generate_combined_image
from services.image_text_overlay import add_text_boxes_to_combined_image
import os, uuid

app = FastAPI()

@app.post("/generate-comic")
def generate_comic(req: DiaryRequest):
    scenes = get_script(req.user_name, req.diary_text)
    prompt = build_combined_prompt(scenes, req.user_name, req.gender)
    image = generate_combined_image(prompt)
    image = add_text_boxes_to_combined_image(image, scenes, font_path="Danjo-bold-Regular.otf")

    filename = f"comic_{uuid.uuid4().hex[:8]}.png"
    output_dir = "outputs"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, filename)
    image.save(output_path)

    return {"filename": filename, "path": output_path}
