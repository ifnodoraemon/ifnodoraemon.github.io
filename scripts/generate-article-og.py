#!/usr/bin/env python3
"""
Generate High-Resolution (1200x630) Raster OpenGraph Images for All Articles
Outputs:
  public/og/{zh,en}/<slug>.png
  .temp_build/public/og/{zh,en}/<slug>.png
  dist/og/{zh,en}/<slug>.png (if dist exists)
"""

import os
import re
import sys
import glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Fonts
ZH_FONT_PATH = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
EN_FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

font_zh_title = ImageFont.truetype(ZH_FONT_PATH, 44)
font_zh_desc = ImageFont.truetype(ZH_FONT_PATH, 22)
font_zh_tag = ImageFont.truetype(ZH_FONT_PATH, 18)
font_zh_brand = ImageFont.truetype(ZH_FONT_PATH, 20)

font_en_title = ImageFont.truetype(EN_FONT_BOLD_PATH, 38)
font_en_desc = ImageFont.truetype(EN_FONT_BOLD_PATH, 20)
font_en_tag = ImageFont.truetype(EN_FONT_BOLD_PATH, 16)
font_en_mono = ImageFont.truetype(EN_FONT_BOLD_PATH, 18)

def wrap_text(text, font, max_width, max_lines=3):
    tokens = re.findall(r'[a-zA-Z0-9_\-\.\/]+|[ \t]+|[\u4e00-\u9fa5]|.', text)
    lines = []
    current = ''
    for token in tokens:
        test = current + token
        bbox = font.getbbox(test)
        if (bbox[2] - bbox[0]) > max_width and current:
            lines.append(current.strip())
            current = token
            if len(lines) == max_lines - 1:
                # If next is the last allowed line, append remainder
                break
        else:
            current = test
    if current and len(lines) < max_lines:
        lines.append(current.strip())
    return lines

def parse_frontmatter(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    m = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', content, re.DOTALL)
    if not m:
        return {}, content
    fm_str, body = m.group(1), m.group(2)
    fm = {}
    for line in fm_str.split('\n'):
        if ':' in line:
            k, v = line.split(':', 1)
            fm[k.strip()] = v.strip().strip('\'\"')
    return fm, body

def render_og_card(title, description, tag, date_str, is_en=False):
    W, H = 1200, 630
    img = Image.new('RGBA', (W, H), (9, 10, 15, 255))

    # Ambient radial glows
    glow1 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d1 = ImageDraw.Draw(glow1)
    d1.ellipse([800, -80, 1350, 420], fill=(99, 102, 241, 40))
    glow1 = glow1.filter(ImageFilter.GaussianBlur(80))
    img = Image.alpha_composite(img, glow1)

    glow2 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(glow2)
    d2.ellipse([-120, 260, 480, 780], fill=(6, 182, 212, 35))
    glow2 = glow2.filter(ImageFilter.GaussianBlur(90))
    img = Image.alpha_composite(img, glow2)

    draw = ImageDraw.Draw(img)

    # Card background & border
    draw.rounded_rectangle([48, 48, 1152, 582], radius=24, fill=(15, 17, 26, 225), outline=(48, 54, 78, 200), width=1)

    # Top glowing gradient line
    for i in range(240):
        ratio = i / 240
        r = int(99 + (6 - 99) * ratio)
        g = int(102 + (182 - 102) * ratio)
        b = int(241 + (212 - 241) * ratio)
        draw.line([(88 + i, 88), (88 + i, 94)], fill=(r, g, b, 255), width=1)

    # Tag pill
    font_tag = font_en_tag if is_en else font_zh_tag
    tag_bbox = font_tag.getbbox(tag)
    tag_w = tag_bbox[2] - tag_bbox[0] + 32
    draw.rounded_rectangle([88, 118, 88 + tag_w, 154], radius=8, fill=(30, 36, 62), outline=(99, 102, 241, 180), width=1)
    draw.text((104, 126), tag, font=font_tag, fill=(129, 140, 248))

    # Brand badge top-right
    top_brand = 'NOBITA TALKS AI' if is_en else '大雄话AI'
    draw.text((1112, 126), top_brand, font=font_en_mono if is_en else font_zh_brand, fill=(100, 116, 139), anchor='ra')

    # Title lines
    font_title = font_en_title if is_en else font_zh_title
    title_lines = wrap_text(title, font_title, 980, max_lines=3)
    curr_y = 185
    line_height = 52 if is_en else 58
    for line in title_lines:
        draw.text((88, curr_y), line, font=font_title, fill=(245, 245, 250))
        curr_y += line_height

    # Description lines
    font_desc = font_en_desc if is_en else font_zh_desc
    clean_desc = re.sub(r'[\r\n\t]+', ' ', description).strip()
    desc_lines = wrap_text(clean_desc, font_desc, 980, max_lines=2)
    curr_y = max(curr_y + 15, 365)
    desc_line_height = 32 if is_en else 34
    for line in desc_lines:
        draw.text((88, curr_y), line, font=font_desc, fill=(148, 163, 184))
        curr_y += desc_line_height

    # Bottom divider
    draw.line([(88, 500), (1112, 500)], fill=(45, 52, 75, 180), width=1)

    # Footer
    footer_date = date_str.replace('-', '.')
    draw.text((88, 528), footer_date, font=font_en_mono, fill=(113, 113, 122))
    draw.text((1112, 528), 'blog.llmgo.top', font=font_en_mono, fill=(6, 182, 212), anchor='ra')

    return img.convert('RGB')

def process_lang(lang_dir, lang_key):
    md_files = sorted(glob.glob(os.path.join(lang_dir, '*.md')))
    is_en = (lang_key == 'en')
    count = 0

    dest_dirs = [
        os.path.join(ROOT, 'public', 'og', lang_key),
        os.path.join(ROOT, '.temp_build', 'public', 'og', lang_key),
    ]
    if os.path.exists(os.path.join(ROOT, 'dist')):
        dest_dirs.append(os.path.join(ROOT, 'dist', 'og', lang_key))

    for d in dest_dirs:
        os.makedirs(d, exist_ok=True)

    for f in md_files:
        fm, body = parse_frontmatter(f)
        slug = fm.get('slug')
        title = fm.get('title')
        description = fm.get('description', '')
        tag = fm.get('tag', 'AI')
        date_str = fm.get('date', '2026-01-01').split('T')[0]

        if not slug or not title:
            continue

        img = render_og_card(title, description, tag, date_str, is_en=is_en)

        for d in dest_dirs:
            out_file = os.path.join(d, f'{slug}.png')
            img.save(out_file, format='PNG', optimize=True)

        count += 1

    return count

def main():
    zh_dir = os.path.join(ROOT, 'content', 'zh', 'articles')
    en_dir = os.path.join(ROOT, 'content', 'en', 'articles')

    zh_count = process_lang(zh_dir, 'zh')
    en_count = process_lang(en_dir, 'en')
    print(f'🎨 Generated {zh_count} ZH and {en_count} EN raster OG images (1200x630) successfully!')

if __name__ == '__main__':
    main()
