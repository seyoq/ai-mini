from PIL import Image, ImageDraw, ImageFont
import textwrap
from services.gpt_scripting import translate_text_to_korean

def add_text_boxes_to_combined_image(
    img: Image.Image,
    scenes: list,
    font_path: str,
    base_font_size: int = 28,
    min_font_size: int = 14,
    ...
) -> Image.Image:
    ...
    # 기존 add_text_boxes_to_combined_image 함수
    ...
