# -*- coding: utf-8 -*-
"""合并封面 PDF 与正文 PDF，生成最终白皮书"""
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 2 or abs(h - A4_H) > 2:
        page.scale_to(A4_W, A4_H)
    return page

COVER_PDF = '/home/z/my-project/scripts/cover.pdf'
BODY_PDF = '/home/z/my-project/scripts/body.pdf'
OUTPUT = '/home/z/my-project/download/Web5.blog_开发框架与架构白皮书_V1.0.pdf'

writer = PdfWriter()

# Add cover as page 1
cover_reader = PdfReader(COVER_PDF)
for page in cover_reader.pages:
    writer.add_page(normalize_page_to_a4(page))

# Add body pages
body_reader = PdfReader(BODY_PDF)
for page in body_reader.pages:
    writer.add_page(normalize_page_to_a4(page))

writer.add_metadata({
    '/Title': 'Web5.blog 开发框架与架构白皮书 V1.0',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Web5.blog Architecture Whitepaper - Personal Digital Liberation Protocol Implementation',
})

with open(OUTPUT, 'wb') as f:
    writer.write(f)

import os
size_mb = os.path.getsize(OUTPUT) / 1024 / 1024
print(f"Final PDF: {OUTPUT}")
print(f"Total pages: {len(writer.pages)}")
print(f"File size: {size_mb:.2f} MB")
