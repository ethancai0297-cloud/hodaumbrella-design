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
  "hero.tag.ribs": { en: "6 / 7 / 8 / 10 rib panels", zh: "6 / 7 / 8 / 10 骨面板" },

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
  "how.step2": { en: "Pick rib count — 6, 7, 8 or 10 panels", zh: "选择骨数 — 6、7、8 或 10 面板" },
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
  "editor.ai": { en: "AI", zh: "AI" },
  "editor.saved": { en: "Project saved", zh: "项目已保存" },
  "editor.savedDesc": { en: "Stored in your browser.", zh: "已保存到浏览器本地。" },
  "editor.exportFail": { en: "Export failed", zh: "导出失败" },
  "editor.pdfFail": { en: "PDF export failed", zh: "PDF 导出失败" },
  "editor.aiFail": { en: "AI export failed", zh: "AI 导出失败" },
  "editor.resetConfirm": { en: "Reset all artwork and panel selection?", zh: "重置所有图案和面板选择？" },
  "editor.reset": { en: "Reset", zh: "重置" },
  "editor.resetTitle": { en: "Reset design?", zh: "重置设计？" },
  "editor.resetBody": { en: "This clears all panel colors, artwork, and selections for this project. This cannot be undone.", zh: "这将清除该项目的所有面板颜色、图案和选择。此操作无法撤销。" },
  "editor.cancel": { en: "Cancel", zh: "取消" },
  "landing.tag.silk": { en: "Silkscreen ready", zh: "丝印就绪" },
  "landing.tag.colors": { en: "+12 colors", zh: "+12 色" },

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
  "wiz.colorChange": { en: "Color-changing silkscreen", zh: "变色丝印" },
  "wiz.colorChange.desc": { en: "Prints look white when dry and reveal full color when wet.", zh: "干燥时显示白色，遇水后显出真实颜色。" },
  "canvas.dry": { en: "Dry", zh: "干" },
  "canvas.wet": { en: "Wet", zh: "湿" },
  "canvas.auto": { en: "Auto", zh: "自动" },
  "canvas.colorChangeHint": { en: "Hover over the artwork to preview the wet color; move away to see it dry. Production files always use real colors.", zh: "将鼠标悬停在图案上可预览遇水显色效果，移开则恢复干燥状态。生产文件始终使用真实颜色。" },
  "wiz.pouch": { en: "5. Pouch (optional)", zh: "5. 伞套（可选）" },
  "wiz.pouch.add": { en: "Add pouch design", zh: "添加伞套设计" },
  "wiz.pouch.desc": { en: "Design the fabric case for folded umbrellas.", zh: "为折叠伞设计配套伞套。" },
  "wiz.doubleLayer": { en: "4. Double-layer canopy (golf only)", zh: "4. 双层伞面（仅高尔夫）" },
  "wiz.doubleLayer.add": { en: "Add inner layer", zh: "添加内层" },
  "wiz.doubleLayer.desc": { en: "Vented top cap or true double canopy.", zh: "可选透气顶盖或全尺寸双层伞面。" },
  "wiz.layerStyle": { en: "Layer style", zh: "层式" },
  "wiz.layerStyle.vented": { en: "Vented top cap", zh: "透气顶盖" },
  "wiz.layerStyle.vented.desc": { en: "Smaller cap over main canopy with central vent for airflow.", zh: "主伞面中心透气，小顶盖覆盖中央。" },
  "wiz.layerStyle.double": { en: "Double canopy", zh: "双层伞面" },
  "wiz.layerStyle.double.desc": { en: "Two full-size canopies of identical panels, edited independently.", zh: "两层全尺寸伞面，面板相同，独立编辑。" },
  "surface.canopy": { en: "Outer layer", zh: "外层" },
  "surface.inner": { en: "Inner layer", zh: "内层" },
  "surface.pouch": { en: "Pouch", zh: "伞套" },
  "pouch.spread": { en: "Spread", zh: "展开" },
  "pouch.front": { en: "Front", zh: "正面" },

  // Cap
  "cap.title": { en: "Cap color (top center)", zh: "顶帽颜色（中心）" },
  "cap.custom": { en: "Custom hex", zh: "自定义十六进制" },

  // Handle insert (BSS-ST-1)
  "insert.title": { en: "Handle insert (BSS-ST-1)", zh: "手柄盖片（BSS-ST-1）" },
  "insert.desc": { en: "Customizable plate on the patented handle ·", zh: "专利手柄侧面的可定制盖片 ·" },
  "insert.finish": { en: "Finish", zh: "表面工艺" },
  "insert.finish.matte": { en: "Matte", zh: "哑光" },
  "insert.finish.gloss": { en: "Gloss", zh: "亮面" },
  "insert.finish.metal": { en: "Metallic", zh: "金属" },
  "insert.logo": { en: "Logo on insert", zh: "盖片 Logo" },
  "insert.uploadLogo": { en: "Upload logo", zh: "上传 Logo" },
  "insert.removeLogo": { en: "Remove logo", zh: "移除 Logo" },
  "insert.logoSize": { en: "Logo size", zh: "Logo 大小" },
  "insert.logoTooLarge": { en: "Logo must be under 2 MB", zh: "Logo 文件需小于 2 MB" },
  "tab.label": { en: "Design options", zh: "设计选项" },
  "tab.canopy": { en: "Canopy", zh: "伞面设计" },
  "tab.handle": { en: "Handle", zh: "伞头设计" },
  "handle.title": { en: "Handle color", zh: "手柄颜色" },
  "handle.desc": { en: "Main body of the BSS-ST-1 handle. Middle-section zones left unset follow this color.", zh: "BSS-ST-1 手柄主体颜色；中段未单独设置的部分会跟随此颜色。" },
  "handle.reset": { en: "Default", zh: "恢复默认" },
  "mid.title": { en: "Middle section (open button)", zh: "中段配色（开伞按钮）" },
  "mid.desc": { en: "Two zones, each customizable. Not set = same as the handle.", zh: "两个区域可分别定制，未设置时与手柄同色。" },
  "mid.body": { en: "Body color", zh: "主体颜色" },
  "mid.accent": { en: "Accent color (rims, button frame, arrows)", zh: "装饰颜色（边条、按钮框、箭头）" },
  "mid.accentFinish": { en: "Accent finish", zh: "装饰色工艺" },
  "mid.sameAsHandle": { en: "Same as handle", zh: "同手柄色" },
  "insert.preview3d": { en: "Switch to 3D Preview to see the insert on the handle.", zh: "切换到 3D 预览查看盖片在手柄上的效果。" },

  // Fabric
  "fabric.title": { en: "Fabric color", zh: "伞布颜色" },
  "fabric.applyToAll": { en: "No panels selected — color applies to all panels.", zh: "未选择面板 — 颜色将应用到全部面板。" },
  "fabric.applyToSelected": { en: "Color applies to {n} selected panel(s).", zh: "颜色将应用到 {n} 个选中面板。" },
  "fabric.resetPanels": { en: "Reset panel colors", zh: "重置面板颜色" },
  "color.Black": { en: "Black", zh: "黑色" },
  "color.Navy": { en: "Navy", zh: "藏青" },
  "color.White": { en: "White", zh: "白色" },
  "color.Red": { en: "Red", zh: "红色" },
  "color.Yellow": { en: "Yellow", zh: "黄色" },
  "color.Green": { en: "Green", zh: "绿色" },
  "color.Royal Blue": { en: "Royal Blue", zh: "宝蓝" },
  "color.Grey": { en: "Grey", zh: "灰色" },
  "color.Silver": { en: "Silver", zh: "银色" },
  "color.Brown": { en: "Brown", zh: "棕色" },
  "color.Gold": { en: "Gold", zh: "金色" },

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
    en: "Same image repeats independently on every panel.",
    zh: "同一图案在每个面板上独立重复。",
  },
  "art.mode.selected": { en: "Selected panels", zh: "选中面板" },
  "art.mode.selectedDesc": {
    en: "Image is printed only on the panels you select. Pick panels on the canvas, then click 'Apply to selection'.",
    zh: "图案仅印在你选中的面板上。在画布上选择面板，然后点击\"应用到选中面板\"。",
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

  // 3D preview
  "view.2d": { en: "2D Design", zh: "2D 设计" },
  "view.3d": { en: "3D Preview", zh: "3D 预览" },
  "threeD.unavailable": {
    en: "3D preview is currently available for 8-panel folding and straight umbrellas. Please use the 2D preview for this specification.",
    zh: "3D 预览目前支持 8 片折叠伞和直骨伞。该规格请使用 2D 预览。",
  },
  "threeD.showFrame": { en: "Show frame", zh: "显示骨架" },
  "threeD.hideFrame": { en: "Hide frame", zh: "隐藏骨架" },
  "threeD.top": { en: "Top", zh: "顶视" },
  "threeD.front": { en: "Front", zh: "正面" },
  "threeD.side": { en: "Side", zh: "侧面" },
  "threeD.bottom": { en: "Bottom", zh: "底视" },
  "threeD.handle": { en: "Handle", zh: "手柄" },
  "threeD.reset": { en: "Reset", zh: "复位" },
  "threeD.screenshot": { en: "Screenshot", zh: "截图" },
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
