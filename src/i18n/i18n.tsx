import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "en" | "zh";

type Dict = Record<string, { en: string; zh: string }>;

const dict: Dict = {
  // Nav / common
  "nav.features": { en: "Features", zh: "功能" },
  "nav.how": { en: "How it works", zh: "使用流程" },
  "nav.projects": { en: "My Projects", zh: "我的项目" },
  "nav.start": { en: "Start Design", zh: "开始设计" },
  "nav.home": { en: "Home", zh: "首页" },

  // Landing hero
  "hero.badge": { en: "MVP for sales & client previews", zh: "为销售与客户预览打造" },
  "hero.title": { en: "Hoda / Tuzh umbrella design generator", zh: "Hoda / Tuzh 雨伞设计生成器" },
  "hero.subtitle": {
    en: "Create umbrella rendering previews for silkscreen logos or full digital print designs. Choose category, rib count, upload artwork and export a quotation-ready mockup in minutes.",
    zh: "为丝印logo或全数码印花设计生成雨伞效果图。选择伞型、骨架数量、上传图案，几分钟内导出可报价的效果图。",
  },
  "hero.cta.start": { en: "Start Design", zh: "开始设计" },
  "hero.cta.projects": { en: "My Projects", zh: "我的项目" },
  "hero.tag.factory": { en: "Factory-confirmed workflow", zh: "工厂确认流程" },
  "hero.tag.ribs": { en: "6 / 8 / 10 rib panels", zh: "6 / 8 / 10 骨面板" },

  // Features
  "feat.title": { en: "Everything sales teams need to close faster", zh: "销售团队成交所需的一切" },
  "feat.subtitle": { en: "Two print modes, three umbrella categories, real-time canopy preview.", zh: "两种印刷模式，三种伞型，实时伞面预览。" },
  "feat.silk.title": { en: "Silkscreen mode", zh: "丝印模式" },
  "feat.silk.desc": { en: "Place logos or text on 1, 2, 4 or 8 panels. Ideal for small-area branding.", zh: "在 1、2、4 或 8 个面板上放置 logo 或文字。适合小面积品牌印刷。" },
  "feat.digital.title": { en: "Digital print mode", zh: "数码印花模式" },
  "feat.digital.desc": { en: "Full-cover artwork or single-panel high-resolution images with fit controls.", zh: "整面覆盖或单面板高清图案，支持适配模式。" },
  "feat.export.title": { en: "Export & quote", zh: "导出与报价" },
  "feat.export.desc": { en: "Download PNG mockups and PDF summaries with category, ribs, panels & notes.", zh: "下载 PNG 效果图及含伞型、骨架、面板与备注的 PDF 报价单。" },

  // How it works
  "how.title": { en: "How it works", zh: "使用流程" },
  "how.step1": { en: "Choose category — folding, straight or golf", zh: "选择伞型 — 折叠、直杆或高尔夫" },
  "how.step2": { en: "Pick rib count — 6, 8 or 10 panels", zh: "选择骨数 — 6、8 或 10 面板" },
  "how.step3": { en: "Select silkscreen or digital print", zh: "选择丝印或数码印花" },
  "how.step4": { en: "Upload artwork, preview & export", zh: "上传图案、预览并导出" },

  "footer.note": { en: "Hoda Umbrella · Tuzh Umbrella — sales preview tool. Final production artwork to be confirmed by factory designer.", zh: "Hoda雨伞 · Tuzh雨伞 — 销售预览工具。最终生产稿需由工厂设计师确认。" },

  // Editor — top bar
  "editor.projectName": { en: "Project name", zh: "项目名称" },
  "editor.customer": { en: "Customer name (optional)", zh: "客户名称（可选）" },
  "editor.save": { en: "Save", zh: "保存" },
  "editor.undo": { en: "Undo", zh: "撤销" },
  "editor.png": { en: "PNG", zh: "PNG" },
  "editor.pdf": { en: "PDF", zh: "PDF" },
  "editor.saved": { en: "Project saved", zh: "项目已保存" },
  "editor.savedDesc": { en: "Stored in your browser.", zh: "已保存到浏览器本地。" },
  "editor.exportFail": { en: "Export failed", zh: "导出失败" },
  "editor.pdfFail": { en: "PDF export failed", zh: "PDF 导出失败" },
  "editor.resetConfirm": { en: "Reset all artwork and panel selection?", zh: "重置所有图案和面板选择？" },

  // Wizard
  "wiz.category": { en: "1. Umbrella category", zh: "1. 雨伞类型" },
  "wiz.ribs": { en: "2. Rib / panel count", zh: "2. 骨架 / 面板数量" },
  "wiz.method": { en: "3. Printing method", zh: "3. 印刷方式" },
  "wiz.folding": { en: "Folding", zh: "折叠伞" },
  "wiz.folding.desc": { en: "Compact, travel", zh: "便携旅行" },
  "wiz.straight": { en: "Straight", zh: "直杆伞" },
  "wiz.straight.desc": { en: "Classic stick", zh: "经典长柄" },
  "wiz.golf": { en: "Golf", zh: "高尔夫伞" },
  "wiz.golf.desc": { en: "Oversized canopy", zh: "超大伞面" },
  "wiz.silkscreen": { en: "Silkscreen", zh: "丝印" },
  "wiz.silkscreen.desc": { en: "Logos / text on selected panels (1, 2, 4 or 8).", zh: "在所选面板上印 logo / 文字（1、2、4 或 8 面）。" },
  "wiz.digital": { en: "Digital print", zh: "数码印花" },
  "wiz.digital.desc": { en: "Full image — single panel or full canopy cover.", zh: "整图 — 单面板或整伞覆盖。" },

  // Fabric
  "fabric.title": { en: "Fabric color", zh: "伞布颜色" },
  "color.Black": { en: "Black", zh: "黑色" },
  "color.Navy": { en: "Navy", zh: "藏青" },
  "color.White": { en: "White", zh: "白色" },
  "color.Red": { en: "Red", zh: "红色" },
  "color.Yellow": { en: "Yellow", zh: "黄色" },
  "color.Green": { en: "Green", zh: "绿色" },
  "color.Royal Blue": { en: "Royal Blue", zh: "宝蓝" },
  "color.Grey": { en: "Grey", zh: "灰色" },

  // Canvas overlay
  "canvas.panels": { en: "Panels", zh: "面板" },
  "canvas.all": { en: "All", zh: "全选" },
  "canvas.clear": { en: "Clear", zh: "清除" },
  "canvas.silkLimit": { en: "Silkscreen max 8 panels", zh: "丝印最多 8 个面板" },
  "canvas.warn.silk": {
    en: "Silkscreen is recommended for small-area logo/text — not full-photo artwork. Final artwork must be confirmed by factory designer.",
    zh: "丝印推荐用于小面积 logo / 文字，不适合整图照片。最终稿件需由工厂设计师确认。",
  },
  "canvas.warn.digital": {
    en: "Digital print is best for photographic / full-surface designs. Upload at 300dpi for sharp production output.",
    zh: "数码印花适合照片 / 整面设计。请上传 300dpi 图像以保证生产清晰度。",
  },
  "canvas.note": { en: "Note:", zh: "提示：" },

  // Artwork panel
  "art.add": { en: "4. Add artwork", zh: "4. 添加图案" },
  "art.upload": { en: "Upload", zh: "上传" },
  "art.addText": { en: "Add text", zh: "添加文字" },
  "art.uploadTip": { en: "PNG, JPG, SVG. Tip: select panels first, then upload to place automatically.", zh: "支持 PNG、JPG、SVG。提示：先选择面板，再上传可自动放置。" },
  "art.combo": { en: "Logo + Text combo", zh: "Logo + 文字 组合" },
  "art.comboTip": { en: "Upload your logo, we'll add a customizable text line below. Edit font, size, color and rotation for each separately.", zh: "上传 Logo，将自动在下方添加一行可编辑文字。字体、字号、颜色与旋转可分别调整。" },
  "art.comboAdded": { en: "Logo + text combo added", zh: "Logo + 文字 组合已添加" },
  "art.title": { en: "Artwork", zh: "图案列表" },
  "art.empty": { en: "No artwork yet. Upload or add text above.", zh: "暂无图案。请在上方上传或添加文字。" },
  "art.text": { en: "Text", zh: "文字" },
  "art.fontSize": { en: "Font size", zh: "字号" },
  "art.color": { en: "Color", zh: "颜色" },
  "art.fontFamily": { en: "Font family", zh: "字体" },
  "art.fit": { en: "Fit mode", zh: "适配模式" },
  "art.printMode": { en: "Print layout", zh: "印花方式" },
  "art.mode.fullCanopy": { en: "Full canopy wrap", zh: "整伞连续图案" },
  "art.mode.perPanel": { en: "Per-panel repeat", zh: "每面板重复" },
  "art.mode.fullCanopyDesc": {
    en: "One continuous image spans the whole canopy across all panels.",
    zh: "一张图案连续覆盖整个伞面，跨越所有面板。",
  },
  "art.mode.perPanelDesc": {
    en: "Same image repeats independently on each selected panel.",
    zh: "同一图案在每个选中面板上独立重复。",
  },
  "art.scale": { en: "Scale", zh: "缩放" },
  "art.rotation": { en: "Rotation", zh: "旋转" },
  "art.offsetX": { en: "Offset X", zh: "横向偏移" },
  "art.offsetY": { en: "Offset Y", zh: "纵向偏移" },
  "art.center": { en: "Center", zh: "居中" },
  "art.applySel": { en: "Apply to selection", zh: "应用到选中面板" },
  "art.duplicate": { en: "Duplicate", zh: "复制" },
  "art.resetRot": { en: "Reset rot", zh: "重置旋转" },
  "art.delete": { en: "Delete", zh: "删除" },
  "art.onPanels": { en: "On panels", zh: "所在面板" },
  "art.cm.title": { en: "Real-world size & position (cm)", zh: "实际尺寸与位置 (厘米)" },
  "art.cm.basedOn": { en: "Based on panel length", zh: "按面板长度计算" },
  "art.cm.logoWidth": { en: "Logo width", zh: "Logo 宽度" },
  "art.cm.fromRim": { en: "Distance from bottom edge (rim)", zh: "距底边（伞边）距离" },
  "art.cm.fromRimHint": { en: "Measured from the outer bottom line of the panel triangle up toward the tip.", zh: "从面板三角形的外侧底边（伞边）向伞尖方向测量。" },
  "art.cm.sideOffset": { en: "Side offset from rib center", zh: "距面板中线偏移" },
  "art.cm.sideHint": { en: "0 = centered", zh: "0 = 居中" },
  "art.cm.disclaimer": { en: "Approximate values for sales reference. Final placement confirmed by factory.", zh: "数值仅供销售参考，最终位置以工厂确认为准。" },
  "art.of": { en: "of", zh: "/ 共" },
  "art.added": { en: "Artwork added", zh: "图案已添加" },
  "art.tooLarge": { en: "File too large", zh: "文件过大" },
  "art.tooLargeDesc": { en: "Max 12MB.", zh: "最大 12MB。" },
  "art.lowRes": { en: "Low resolution image", zh: "图像分辨率较低" },
  "art.lowResDesc": { en: "For best print quality use 1500px or larger.", zh: "建议使用 1500px 以上的图像以获得最佳印刷质量。" },

  // Notes
  "notes.title": { en: "Production notes", zh: "生产说明" },
  "notes.1": { en: "Rib count equals panel count for the visual layout.", zh: "可视化布局中骨架数等于面板数。" },
  "notes.2": { en: "Silkscreen limited to 1, 2, 4 or 8 panels for cost efficiency.", zh: "丝印限于 1、2、4 或 8 面板以控制成本。" },
  "notes.3": { en: "Digital print supports single panel or full-canopy cover.", zh: "数码印花支持单面板或整伞覆盖。" },
  "notes.4": { en: "This preview is for sales confirmation — colors on final fabric may vary.", zh: "此预览仅用于销售确认 — 实际伞布颜色可能略有差异。" },

  // Projects page
  "proj.title": { en: "My projects", zh: "我的项目" },
  "proj.new": { en: "New design", zh: "新建设计" },
  "proj.empty": { en: "No saved projects yet.", zh: "暂无已保存的项目。" },
  "proj.createFirst": { en: "Create your first design", zh: "创建您的第一个设计" },
  "proj.category": { en: "Category", zh: "伞型" },
  "proj.ribs": { en: "Ribs", zh: "骨数" },
  "proj.method": { en: "Method", zh: "印刷" },
  "proj.artwork": { en: "Artwork", zh: "图案" },
  "proj.items": { en: "items", zh: "个" },
  "proj.open": { en: "Open", zh: "打开" },
  "proj.updated": { en: "Updated", zh: "更新于" },
  "proj.deleteConfirm": { en: "Delete this project?", zh: "确定删除该项目？" },

  // Category values
  "cat.folding": { en: "folding", zh: "折叠" },
  "cat.straight": { en: "straight", zh: "直杆" },
  "cat.golf": { en: "golf", zh: "高尔夫" },
  "method.silkscreen": { en: "silkscreen", zh: "丝印" },
  "method.digital": { en: "digital", zh: "数码" },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("urs:lang") as Lang | null;
    if (stored === "en" || stored === "zh") return stored;
    return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  });

  useEffect(() => {
    localStorage.setItem("urs:lang", lang);
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const t = (key: string) => dict[key]?.[lang] ?? key;
  return <Ctx.Provider value={{ lang, setLang: setLangState, t }}>{children}</Ctx.Provider>;
};

export const useI18n = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
};
