# -*- coding: utf-8 -*-
"""
Web5.blog 开发框架与架构白皮书 - PDF 主运行脚本
依次执行三个内容文件，最终生成 body.pdf
"""
import os, sys

# Add scripts directory to path
sys.path.insert(0, '/home/z/my-project/scripts')

# Step 1: 执行 setup（字体、调色板、样式、helpers）
print("=" * 60)
print("Step 1: Loading setup (fonts, palette, styles, helpers)...")
print("=" * 60)
exec(open('/home/z/my-project/scripts/gen_pdf_part1_setup.py').read())

# Step 2: 执行 part1（TOC + 第1-6章）
print("\n" + "=" * 60)
print("Step 2: Generating TOC + Chapters 1-6...")
print("=" * 60)
exec(open('/home/z/my-project/scripts/gen_web5_pdf.py').read())

# Step 3: 执行 part2（第7-12章）
print("\n" + "=" * 60)
print("Step 3: Generating Chapters 7-12...")
print("=" * 60)
exec(open('/home/z/my-project/scripts/gen_web5_pdf_part2.py').read())

# Step 4: 执行 part3（第13-16章 + 结语 + 构建 PDF）
print("\n" + "=" * 60)
print("Step 4: Generating Chapters 13-16 + Epilogue + Building PDF...")
print("=" * 60)
exec(open('/home/z/my-project/scripts/gen_web5_pdf_part3.py').read())

print("\n" + "=" * 60)
print("ALL DONE!")
print("=" * 60)
