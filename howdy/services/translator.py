from config.openai_client import client

def translate_text_to_korean(text: str) -> str:
    res = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": f"Translate into comics style natural Korean:\n{text}"}],
        temperature=0.5,
    )
    return res.choices[0].message.content.strip()
