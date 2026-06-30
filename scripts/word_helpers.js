// gen_web5_word.js
// Web5.blog 开发框架与架构白皮书 - Word 版本生成
// 使用 docx-js (npm: docx) 生成专业 .docx 文档
const docx = require('docx');
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, TableLayoutType, PageOrientation, LevelFormat,
  Header, Footer, PageNumber, NumberFormat, TabStopType, TabStopPosition,
  TableOfContents, StyleLevel, SectionType, convertInchesToTwip
} = docx;

// ━━ Color Palette (aligned with PDF Crystal Blue theme) ━━
const C = {
  HEADER_FILL: '1A4A7A',
  ACCENT: '2D7AB3',
  ACCENT_2: '4DA8DA',
  TEXT_PRIMARY: '142840',
  TEXT_MUTED: '5A7A96',
  CARD_BG: 'E4ECF5',
  TABLE_STRIPE: 'EEF3FA',
  BORDER: 'C0D0E2',
  CODE_BG: 'F0F4F8',
  WHITE: 'FFFFFF',
};

// ━━ Font constants ━━
const FONT_BODY = 'Noto Serif SC';
const FONT_HEADING = 'Noto Sans SC';
const FONT_CODE = 'Sarasa Mono SC';

// ━━ Helper: create body paragraph ━━
function bodyPara(text, opts = {}) {
  return new Paragraph({
    spacing: { line: 360, before: 0, after: 120 },
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 420 },
    children: [new TextRun({ text, font: FONT_BODY, size: 21, color: C.TEXT_PRIMARY })],
    ...opts,
  });
}

function bodyParaNoIndent(text) {
  return new Paragraph({
    spacing: { line: 360, before: 0, after: 120 },
    alignment: AlignmentType.LEFT,
    children: [new TextRun({ text, font: FONT_BODY, size: 21, color: C.TEXT_PRIMARY })],
  });
}

// ━━ Helper: create heading ━━
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 240 },
    children: [new TextRun({ text, font: FONT_HEADING, size: 36, bold: true, color: C.HEADER_FILL })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, font: FONT_HEADING, size: 28, bold: true, color: C.ACCENT })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, font: FONT_HEADING, size: 24, bold: true, color: C.TEXT_PRIMARY })],
  });
}

// ━━ Helper: code block (as shaded paragraph) ━━
function codeBlock(code, label) {
  const lines = code.split('\n');
  const children = [];
  if (label) {
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 40 },
      children: [new TextRun({ text: label, font: FONT_CODE, size: 14, color: C.ACCENT, italics: true })],
    }));
  }
  lines.forEach(line => {
    children.push(new Paragraph({
      spacing: { line: 260, before: 0, after: 0 },
      shading: { type: ShadingType.CLEAR, fill: C.CODE_BG },
      children: [new TextRun({ text: line || ' ', font: FONT_CODE, size: 16, color: C.TEXT_PRIMARY })],
    }));
  });
  children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
  return children;
}

// ━━ Helper: callout box (single-cell table) ━━
function calloutBox(title, body) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      left: { style: BorderStyle.SINGLE, size: 24, color: C.ACCENT },
    },
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: C.CARD_BG },
        margins: { top: 200, bottom: 200, left: 280, right: 280 },
        children: [
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: title, font: FONT_HEADING, size: 22, bold: true, color: C.ACCENT })],
          }),
          new Paragraph({
            spacing: { line: 320 },
            children: [new TextRun({ text: body, font: FONT_BODY, size: 20, color: C.TEXT_PRIMARY })],
          }),
        ],
      })],
    })],
  });
}

// ━━ Helper: data table ━━
function dataTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      width: { size: colWidths[i], type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: C.HEADER_FILL },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: h, font: FONT_HEADING, size: 20, bold: true, color: C.WHITE })],
      })],
    })),
  });

  const bodyRows = rows.map((row, idx) => new TableRow({
    children: row.map((cell, i) => new TableCell({
      width: { size: colWidths[i], type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? C.WHITE : C.TABLE_STRIPE },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: String(cell), font: FONT_BODY, size: 19, color: C.TEXT_PRIMARY })],
      })],
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: C.BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: C.BORDER },
      left: { style: BorderStyle.SINGLE, size: 4, color: C.BORDER },
      right: { style: BorderStyle.SINGLE, size: 4, color: C.BORDER },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: C.BORDER },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: C.BORDER },
    },
    rows: [headerRow, ...bodyRows],
  });
}

// ━━ Helper: caption ━━
function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 240 },
    children: [new TextRun({ text, font: FONT_BODY, size: 18, color: C.TEXT_MUTED, italics: true })],
  });
}

// ━━ Cover Page (single full-page table) ━━
function coverPage() {
  const coverContent = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 1200, after: 200 },
      children: [new TextRun({
        text: 'ARCHITECTURE WHITEPAPER · V1.0',
        font: FONT_CODE, size: 18, color: C.ACCENT_2,
      }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({ text: 'Web5.blog', font: FONT_HEADING, size: 80, bold: true, color: C.HEADER_FILL }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: '开发框架与架构白皮书', font: FONT_HEADING, size: 64, bold: true, color: C.ACCENT }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 400, after: 160 },
      children: [
        new TextRun({ text: '个人数字解放的协议级实现', font: FONT_BODY, size: 28, color: C.ACCENT }),
        new TextRun({ text: '\nPrime × Eidolon × Vessel 三层生命架构', font: FONT_BODY, size: 28, color: C.ACCENT }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 400, after: 400 },
      children: [
        new TextRun({
          text: '本白皮书基于朴叔 Web5 个人解放互联网愿景，融合马克思主义政治经济学、戴维经济学比较优势理论与 PLVTVS.Network 代码资产，系统阐述 Web5.blog 作为全球首个分身原生博客平台的协议设计、五层架构、六大开发优先级、30/60/90 天冲刺路线图、技术风险矩阵与合规监管框架。',
          font: FONT_BODY, size: 22, color: C.TEXT_MUTED,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({ text: 'AP2 · ARP · AA2P · ERC-4337 · DWN', font: FONT_CODE, size: 20, color: C.HEADER_FILL, bold: true }),
      ],
    }),
    new Paragraph({
      spacing: { before: 1200, after: 120 },
      children: [
        new TextRun({ text: '架构师级完整版 · 30/60/90 天冲刺路线图', font: FONT_HEADING, size: 24, bold: true, color: C.TEXT_PRIMARY }),
      ],
    }),
    new Paragraph({
      spacing: { after: 400 },
      children: [
        new TextRun({ text: 'PREPARED FOR · 朴叔 Web5 生态', font: FONT_CODE, size: 18, color: C.TEXT_MUTED }),
      ],
    }),
    new Paragraph({
      spacing: { before: 800 },
      children: [
        new TextRun({ text: 'PLVTVS.ONE × EIDOLONOS.XYZ × WEB5.BLOG', font: FONT_CODE, size: 16, color: C.TEXT_MUTED }),
        new TextRun({ text: '        2026 · DIGITAL LIBERATION · V1.0', font: FONT_CODE, size: 16, color: C.ACCENT }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
  return coverContent;
}

module.exports = {
  C, FONT_BODY, FONT_HEADING, FONT_CODE,
  bodyPara, bodyParaNoIndent, h1, h2, h3,
  codeBlock, calloutBox, dataTable, caption, coverPage,
  Document, Packer, Paragraph, TextRun, PageBreak, AlignmentType,
  HeadingLevel, Header, Footer, PageNumber, NumberFormat,
  TableOfContents, StyleLevel, SectionType, TabStopType, TabStopPosition,
};
