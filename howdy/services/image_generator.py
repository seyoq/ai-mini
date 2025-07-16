from config.openai_client import client
import requests, io
from PIL import Image
import time

def generate_combined_image(prompt: str, max_retries: int = 3) -> Image.Image:
    for attempt in range(max_retries):
        try:
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="hd",
                n=1,
                response_format="url",
                style="natural",
            )
            image_url = response.data[0].url
            return Image.open(io.BytesIO(requests.get(image_url).content))
        except Exception as e:
            if "content_policy_violation" in str(e):
                time.sleep(1)
                continue
            raise
