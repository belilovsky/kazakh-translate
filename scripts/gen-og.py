"""Generate OG image (1200x630) and favicon for Қазтілші"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'client', 'public')
os.makedirs(OUT_DIR, exist_ok=True)

# === OG Image 1200x630 ===
W, H = 1200, 630
img = Image.new('RGB', (W, H))
draw = ImageDraw.Draw(img)

# Gradient background: warm golden to deep amber
for y in range(H):
    r = int(248 - (y / H) * 50)
    g = int(237 - (y / H) * 70)
    b = int(212 - (y / H) * 100)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# Draw a subtle ornamental pattern in the background
for i in range(0, W + 60, 60):
    for j in range(0, H + 60, 60):
        # Small diamond shapes
        pts = [(i, j - 8), (i + 8, j), (i, j + 8), (i - 8, j)]
        draw.polygon(pts, fill=None, outline=(200, 170, 100, 40))

# Draw the shanyrak-inspired circle (center-left area)
cx, cy = 280, H // 2
radius = 100

# Outer ring
draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
             outline=(180, 130, 50), width=4)

# Diamond inside
pts = [(cx, cy - 80), (cx + 80, cy), (cx, cy + 80), (cx - 80, cy)]
draw.polygon(pts, outline=(180, 130, 50), width=3)
# Fill diamond semi-transparent
for offset in range(1, 70):
    ratio = offset / 70
    alpha_r = int(210 + ratio * 30)
    alpha_g = int(185 + ratio * 30)
    alpha_b = int(140 + ratio * 30)
    draw.line([(cx - 80 + offset, cy), (cx, cy - 80 + offset)], fill=(alpha_r, alpha_g, alpha_b), width=1)
    draw.line([(cx + 80 - offset, cy), (cx, cy + 80 - offset)], fill=(alpha_r, alpha_g, alpha_b), width=1)

# Cross inside circle
draw.line([(cx - 90, cy), (cx + 90, cy)], fill=(180, 130, 50), width=2)
draw.line([(cx, cy - 90), (cx, cy + 90)], fill=(180, 130, 50), width=2)

# Center dot
draw.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(195, 145, 50))

# Қ letter in center
try:
    font_letter = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
except:
    font_letter = ImageFont.load_default()
bbox = draw.textbbox((0, 0), "Қ", font=font_letter)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
draw.text((cx - tw // 2, cy - th // 2 - 2), "Қ", fill=(255, 255, 255), font=font_letter)

# Main title: "Қазтілші"
try:
    font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
    font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
    font_desc = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    font_url = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
except:
    font_title = ImageFont.load_default()
    font_sub = font_title
    font_desc = font_title
    font_url = font_title

# Title
tx = 440
draw.text((tx, 160), "Қазтілші", fill=(80, 55, 20), font=font_title)

# Subtitle
draw.text((tx, 260), "AI аудармашы · Казахский переводчик", fill=(120, 90, 45), font=font_sub)

# Description line
draw.text((tx, 330), "Русский → Қазақша · English → Қазақша", fill=(140, 110, 65), font=font_desc)

# Engine badges
engines_text = "GPT-4o  ·  Gemini 2.5  ·  Qwen 72B  ·  Ensemble AI"
draw.text((tx, 390), engines_text, fill=(155, 125, 75), font=font_desc)

# URL at bottom
draw.text((tx, 500), "kmt.qdev.run", fill=(160, 130, 80), font=font_url)

# Bottom ornamental line
for x in range(0, W, 20):
    pts = [(x, H - 25), (x + 10, H - 35), (x + 20, H - 25)]
    draw.polygon(pts, fill=None, outline=(190, 155, 90))

# Top ornamental line  
for x in range(0, W, 20):
    pts = [(x, 25), (x + 10, 15), (x + 20, 25)]
    draw.polygon(pts, fill=None, outline=(210, 180, 120))

img.save(os.path.join(OUT_DIR, 'og-image.png'), 'PNG', optimize=True)
print("✓ og-image.png created")

# === Favicon 32x32 ===
fav = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
fd = ImageDraw.Draw(fav)

# Golden circle
fd.ellipse([2, 2, 30, 30], fill=(200, 155, 55), outline=(170, 125, 40), width=1)

# Қ letter
try:
    ff = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
except:
    ff = ImageFont.load_default()
bbox = fd.textbbox((0, 0), "Қ", font=ff)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
fd.text((16 - tw // 2, 16 - th // 2 - 1), "Қ", fill=(255, 255, 255), font=ff)

fav.save(os.path.join(OUT_DIR, 'favicon.png'), 'PNG')
print("✓ favicon.png created")

# === Apple Touch Icon 180x180 ===
touch = Image.new('RGBA', (180, 180), (0, 0, 0, 0))
td = ImageDraw.Draw(touch)

# Rounded golden background
td.rounded_rectangle([0, 0, 180, 180], radius=36, fill=(200, 155, 55))

# Қ letter
try:
    tf = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 100)
except:
    tf = ImageFont.load_default()
bbox = td.textbbox((0, 0), "Қ", font=tf)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
td.text((90 - tw // 2, 90 - th // 2 - 4), "Қ", fill=(255, 255, 255), font=tf)

touch.save(os.path.join(OUT_DIR, 'apple-touch-icon.png'), 'PNG')
print("✓ apple-touch-icon.png created")

# === OG Dark variant 1200x630 ===
imgd = Image.new('RGB', (W, H))
dd = ImageDraw.Draw(imgd)

# Dark gradient
for y in range(H):
    r = int(28 + (y / H) * 15)
    g = int(22 + (y / H) * 10)
    b = int(18 + (y / H) * 8)
    dd.line([(0, y), (W, y)], fill=(r, g, b))

# Diamond ornaments (faint)
for i in range(0, W + 60, 60):
    for j in range(0, H + 60, 60):
        pts = [(i, j - 8), (i + 8, j), (i, j + 8), (i - 8, j)]
        dd.polygon(pts, fill=None, outline=(60, 48, 30))

# Shanyrak circle
dd.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
           outline=(200, 160, 60), width=4)
pts = [(cx, cy - 80), (cx + 80, cy), (cx, cy + 80), (cx - 80, cy)]
dd.polygon(pts, outline=(200, 160, 60), width=3)
dd.line([(cx - 90, cy), (cx + 90, cy)], fill=(200, 160, 60), width=2)
dd.line([(cx, cy - 90), (cx, cy + 90)], fill=(200, 160, 60), width=2)
dd.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(210, 170, 60))
dd.text((cx - tw // 2, cy - th // 2 - 2), "Қ", fill=(40, 30, 15), font=font_letter)

dd.text((tx, 160), "Қазтілші", fill=(230, 210, 170), font=font_title)
dd.text((tx, 260), "AI аудармашы · Казахский переводчик", fill=(180, 155, 110), font=font_sub)
dd.text((tx, 330), "Русский → Қазақша · English → Қазақша", fill=(150, 130, 95), font=font_desc)
dd.text((tx, 390), engines_text, fill=(140, 120, 85), font=font_desc)
dd.text((tx, 500), "kmt.qdev.run", fill=(160, 140, 100), font=font_url)

for x in range(0, W, 20):
    pts = [(x, H - 25), (x + 10, H - 35), (x + 20, H - 25)]
    dd.polygon(pts, fill=None, outline=(70, 55, 35))
for x in range(0, W, 20):
    pts = [(x, 25), (x + 10, 15), (x + 20, 25)]
    dd.polygon(pts, fill=None, outline=(70, 55, 35))

imgd.save(os.path.join(OUT_DIR, 'og-image-dark.png'), 'PNG', optimize=True)
print("✓ og-image-dark.png created")

print("\nAll assets generated in", OUT_DIR)
