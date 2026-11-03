# -*- coding: utf-8 -*-
"""
Web5.blog 开发框架与架构白皮书 - PDF 正文生成脚本
基于 ReportLab + TocDocTemplate，生成带自动目录的 30-40 页架构师级白皮书
"""
import os, sys, hashlib, platform
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, CondPageBreak, Image, Flowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━ Skill scripts path ━━
PDF_SKILL_DIR = '/home/z/my-project/skills/pdf'
_scripts = os.path.join(PDF_SKILL_DIR, 'scripts')
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)

# ━━ Font Registration ━━
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
# Noto Sans SC variable font has ReportLab compatibility issues; use NotoSerifSC for sans-serif roles too
pdfmetrics.registerFont(TTFont('Noto Sans SC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Noto Sans SC Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('Noto Sans SC', normal='Noto Sans SC', bold='Noto Sans SC Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold', italic='FreeSerif-Italic')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSC')

from pdf import install_font_fallback
install_font_fallback()

# ━━ Cascade Palette (Crystal Blue family - aligned with cover Template 07) ━━
PAGE_BG       = colors.HexColor('#f5f8fc')
SECTION_BG    = colors.HexColor('#edf2f9')
CARD_BG       = colors.HexColor('#e4ecf5')
TABLE_STRIPE  = colors.HexColor('#eef3fa')
HEADER_FILL   = colors.HexColor('#1a4a7a')
COVER_BLOCK   = colors.HexColor('#2d5a8a')
BORDER        = colors.HexColor('#c0d0e2')
ICON          = colors.HexColor('#4a7aa8')
ACCENT        = colors.HexColor('#2d7ab3')
ACCENT_2      = colors.HexColor('#4da8da')
TEXT_PRIMARY  = colors.HexColor('#142840')
TEXT_MUTED    = colors.HexColor('#5a7a96')
CODE_BG       = colors.HexColor('#f0f4f8')
CODE_BORDER   = colors.HexColor('#d0dae5')

# ━━ Page Layout ━━
PAGE_W, PAGE_H = A4
LEFT_M = 22*mm
RIGHT_M = 22*mm
TOP_M = 22*mm
BOTTOM_M = 22*mm
AVAIL_W = PAGE_W - LEFT_M - RIGHT_M

# ━━ Styles ━━
styles = getSampleStyleSheet()

H1 = ParagraphStyle(
    name='H1', fontName='NotoSerifSC-Bold', fontSize=20, leading=28,
    textColor=HEADER_FILL, alignment=TA_LEFT, spaceBefore=18, spaceAfter=12,
    wordWrap='CJK'
)
H2 = ParagraphStyle(
    name='H2', fontName='NotoSerifSC-Bold', fontSize=15, leading=22,
    textColor=ACCENT, alignment=TA_LEFT, spaceBefore=14, spaceAfter=8,
    wordWrap='CJK'
)
H3 = ParagraphStyle(
    name='H3', fontName='NotoSerifSC-Bold', fontSize=12.5, leading=18,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceBefore=10, spaceAfter=6,
    wordWrap='CJK'
)
BODY = ParagraphStyle(
    name='Body', fontName='NotoSerifSC', fontSize=10.5, leading=18,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceBefore=0, spaceAfter=8,
    wordWrap='CJK', firstLineIndent=21
)
BODY_NOINDENT = ParagraphStyle(
    name='BodyNoIndent', fontName='NotoSerifSC', fontSize=10.5, leading=18,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceBefore=0, spaceAfter=8,
    wordWrap='CJK'
)
BULLET = ParagraphStyle(
    name='Bullet', fontName='NotoSerifSC', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceBefore=0, spaceAfter=4,
    wordWrap='CJK', leftIndent=21, bulletIndent=6
)
QUOTE = ParagraphStyle(
    name='Quote', fontName='NotoSerifSC', fontSize=10.5, leading=17,
    textColor=TEXT_MUTED, alignment=TA_LEFT, spaceBefore=8, spaceAfter=8,
    wordWrap='CJK', leftIndent=18, rightIndent=18,
    borderColor=ACCENT_2, borderWidth=0, borderPadding=8,
    backColor=CARD_BG
)
CODE = ParagraphStyle(
    name='Code', fontName='SarasaMonoSC', fontSize=8.5, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceBefore=4, spaceAfter=4,
    wordWrap=None, leftIndent=8, rightIndent=8,
    backColor=CODE_BG, borderColor=CODE_BORDER, borderWidth=0.5, borderPadding=8
)
TOC_TITLE = ParagraphStyle(
    name='TOCTitle', fontName='NotoSerifSC-Bold', fontSize=22, leading=30,
    textColor=HEADER_FILL, alignment=TA_LEFT, spaceBefore=0, spaceAfter=18
)
TABLE_HEADER = ParagraphStyle(
    name='TableHeader', fontName='NotoSerifSC-Bold', fontSize=10, leading=14,
    textColor=colors.white, alignment=TA_CENTER, wordWrap='CJK'
)
TABLE_CELL = ParagraphStyle(
    name='TableCell', fontName='NotoSerifSC', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK'
)
TABLE_CELL_CENTER = ParagraphStyle(
    name='TableCellCenter', fontName='NotoSerifSC', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, wordWrap='CJK'
)
CAPTION = ParagraphStyle(
    name='Caption', fontName='NotoSerifSC', fontSize=9, leading=12,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=12
)

# ━━ TOC Document Template ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

# ━━ Page Decoration (header/footer) ━━
def page_decoration(canvas, doc):
    canvas.saveState()
    # Footer line
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(LEFT_M, 15*mm, PAGE_W - RIGHT_M, 15*mm)
    # Footer text
    canvas.setFont('NotoSerifSC', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(LEFT_M, 10*mm, 'Web5.blog 开发框架与架构白皮书 · V1.0')
    canvas.drawRightString(PAGE_W - RIGHT_M, 10*mm, '第 %d 页' % doc.page)
    # Top accent line
    canvas.setStrokeColor(ACCENT_2)
    canvas.setLineWidth(1.5)
    canvas.line(LEFT_M, PAGE_H - 15*mm, LEFT_M + 30*mm, PAGE_H - 15*mm)
    canvas.restoreState()

# ━━ Helper: Code Block ━━
def code_block(code_text, lang_label=''):
    """Render a code block with background and optional language label."""
    elements = []
    if lang_label:
        label_style = ParagraphStyle(
            name='CodeLabel', fontName='SarasaMonoSC', fontSize=7.5, leading=10,
            textColor=ACCENT, alignment=TA_RIGHT, spaceBefore=0, spaceAfter=2
        )
        elements.append(Paragraph(lang_label, label_style))
    # Escape HTML special chars
    escaped = code_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    # Preserve line breaks
    escaped = escaped.replace('\n', '<br/>')
    # Preserve spaces
    escaped = escaped.replace('  ', '&nbsp;&nbsp;')
    elements.append(Paragraph(escaped, CODE))
    elements.append(Spacer(1, 8))
    return elements

# ━━ Helper: Callout Box ━━
def callout_box(title, body_text, color=ACCENT):
    """Create a callout box with title and body."""
    callout_style = ParagraphStyle(
        name='CalloutTitle', fontName='NotoSerifSC-Bold', fontSize=10.5, leading=15,
        textColor=color, alignment=TA_LEFT, spaceBefore=0, spaceAfter=4, wordWrap='CJK'
    )
    callout_body = ParagraphStyle(
        name='CalloutBody', fontName='NotoSerifSC', fontSize=10, leading=16,
        textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceBefore=0, spaceAfter=0, wordWrap='CJK'
    )
    inner = [
        Paragraph(title, callout_style),
        Paragraph(body_text, callout_body)
    ]
    t = Table([[inner]], colWidths=[AVAIL_W])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CARD_BG),
        ('LINEBEFORE', (0,0), (0,-1), 3, color),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    return [t, Spacer(1, 10)]

# ━━ Helper: Data Table ━━
def data_table(headers, rows, col_ratios=None):
    """Create a styled data table."""
    n_cols = len(headers)
    if col_ratios is None:
        col_ratios = [1.0/n_cols] * n_cols
    col_widths = [r * AVAIL_W for r in col_ratios]
    data = [[Paragraph('<b>%s</b>' % h, TABLE_HEADER) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), TABLE_CELL) for c in row])
    t = Table(data, colWidths=col_widths, hAlign='CENTER', repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0,i), (-1,i), TABLE_STRIPE))
        else:
            style_cmds.append(('BACKGROUND', (0,i), (-1,i), colors.white))
    t.setStyle(TableStyle(style_cmds))
    return t

print("Setup complete. Styles and helpers loaded.")
