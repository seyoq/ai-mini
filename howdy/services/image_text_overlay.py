from PIL import Image, ImageDraw, ImageFont
import textwrap
from services.translator import translate_text_to_korean




def add_text_boxes_to_combined_image(
    img: Image.Image,
    scenes: list,
    font_path: str = None,
    *,
    base_font_size: int = 28,
    min_font_size: int = 14,
    box_height_ratio: float = 0.22,
    padding: int = 20,
    text_color: str = "black",
    box_fill: str = "white",
    box_outline: str = "white",
    max_chars_per_line: int = 20,
    max_lines: int = 5
) -> Image.Image:
    draw = ImageDraw.Draw(img)
    panel_width = img.width // 2
    panel_height = img.height // 2
    box_height = int(panel_height * box_height_ratio)

    positions = [
        (0, 0), (panel_width, 0),
        (0, panel_height), (panel_width, panel_height)
    ]

    for idx, (x, y) in enumerate(positions):
        original_dialogue = scenes[idx]['dialogue']
        translated = translate_text_to_korean(original_dialogue)

        # 각 컷마다 폰트 크기 별도 계산
        font_size = base_font_size
        while font_size >= min_font_size:
            font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()
            wrapped = textwrap.fill(translated, width=max_chars_per_line)
            lines = wrapped.split('\n')

            total_text_height = len(lines) * (font_size + 6) + padding * 2
            if total_text_height <= box_height:
                break
            font_size -= 2

        if font_size < min_font_size:
            font_size = min_font_size
            font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()
            wrapped = textwrap.fill(translated, width=max_chars_per_line)
            lines = wrapped.split('\n')
            if len(lines) > max_lines:
                lines = lines[:max_lines]
                lines[-1] = lines[-1].rstrip() + "..."
        else:
            font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()

        box_top = y + panel_height - box_height
        box_bottom = y + panel_height
        draw.rectangle(
            [x, box_top, x + panel_width, box_bottom],
            fill=box_fill,
            outline=box_outline
        )

        text_y = box_top + padding
        for line in lines:
            draw.text((x + padding, text_y), line, fill=text_color, font=font)
            text_y += font_size + 6

    return img

