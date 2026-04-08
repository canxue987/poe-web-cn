import zhDictRaw from './zh_dict.json';

const flatDict: Record<string, string> = (zhDictRaw && (zhDictRaw as any).default) ? (zhDictRaw as any).default : zhDictRaw;

// ==========================================
// 1. 动态调试开关设置
// ==========================================
// 默认全部关闭。需要看日志时，在浏览器控制台输入 __TRANSLATE_DEBUG__(true) 即可开启！
let DEBUG_MISS = false;
let DEBUG_HIT = false;

const missLog: Set<string> = new Set();
if (typeof window !== 'undefined') {
    (window as any).__TRANSLATE_MISSES__ = missLog;
    (window as any).__TRANSLATE_DEBUG__ = (on: boolean) => {
        (window as any).__DEBUG_MISS__ = on;
        (window as any).__DEBUG_HIT__ = on;
        console.log(`%c[PoB 翻译引擎] 动态 Debug 模式已${on ? '开启 🟢' : '关闭 🔴'}`, "color: #00bcd4; font-weight: bold;");
    };
}

// 辅助判定当前是否需要打印日志
function isDebugMissOn() {
    return DEBUG_MISS || (typeof window !== 'undefined' && (window as any).__DEBUG_MISS__);
}
function isDebugHitOn() {
    return DEBUG_HIT || (typeof window !== 'undefined' && (window as any).__DEBUG_HIT__);
}


// ==========================================
// 2. 词典加载与核心工具
// ==========================================
// 🛡️ 终极清洗器：转小写 -> 压缩多余空格 -> 剥除首尾所有的冒号、句号、逗号和空格
function cleanString(str: string): string {
    if (!str) return "";
    return str.toLowerCase()
              .replace(/\s+/g, ' ')           // 多个空格压成一个
              .replace(/^[\s.:,]+|[\s.:,]+$/g, ''); // 暴力扒掉首尾的标点
}

// 构建弹性词典
const resilientDict: Record<string, string> = {};
for (const key in flatDict) {
    if (key === "__POB_MAGIC_REGEX__") continue;
    resilientDict[cleanString(key)] = flatDict[key];
}

function lookup(text: string): string | null {
    return resilientDict[cleanString(text)] || null;
}


// ==========================================
// 3. 拦截与解析辅助机制
// ==========================================
/**
 * 机制：无意义文本拦截器 (极大提升性能)
 */
function isIgnorable(text: string): boolean {
    // 掏空法：挖掉介词/单位后，如果只剩数字和符号，直接拦截
    const textWithoutWords = text.replace(/to|per|point|level/gi, '').trim();
    if (/^[\d\+\-\.\%\s\[\]\(\)]+$/.test(textWithoutWords)) return true;

    // 拦截明确的 UI 提示前缀
    if (text.startsWith("Tip: ") || text.startsWith("Tags: ")) return true;
    
    // 拦截 PoB 特有的无需翻译的短语
    const uselessPhrases = ["Release", "Update", "Allocating this node will", "Allocating this node will give"];
    if (uselessPhrases.includes(text)) return true;

    return false;
}

/**
 * 机制：PoB 缝合怪面板数值精确解析
 */
function translatePoBStatLine(text: string): string | null {
    // 模式 1: 处理 "+1,334 Armour" 或 "-0.1 Hit DPS" (已支持千分位逗号)
    const pobStatRegex = /^([+-]?[\d\.,]+%?\s+)([A-Za-z\s]+)(\s*[\(\[].*)?$/;
    const match = text.match(pobStatRegex);
    if (match) {
        const prefix = match[1];
        const statName = match[2].trim();
        const suffix = match[3] || "";
        
        const translatedStat = lookup(statName);
        if (translatedStat) {
            return `${prefix}${translatedStat}${suffix}`;
        }
    }

    // 模式 2: 处理 "Evasion Rating: 1354" (属性名在前的排版)
    const propRegex = /^([A-Za-z\s]+):\s*([\d\.,]+)$/;
    const propMatch = text.match(propRegex);
    if (propMatch) {
        const statName = propMatch[1].trim();
        const statValue = propMatch[2];
        const translatedStat = lookup(statName);
        if (translatedStat) {
            return `${translatedStat}: ${statValue}`;
        }
    }

    return null;
}


// ===== 数值正则：终极版 (支持整体捕获 (30-40) 区间，以及普通千分位小数) =====
const numberRegex = /(?:\(\d+(?:,\d+)*(?:\.\d+)?-\d+(?:,\d+)*(?:\.\d+)?\))|-?\d+(?:,\d+)*(?:\.\d+)?/g;

/**
 * 机制：生成模板时，同时尝试多种变体
 */
function tryTemplateVariants(template: string): string | null {
    const direct = lookup(template);
    if (direct) return direct;

    const variant1 = template.replace(/\{(\d+)\}%/g, '{$1} %');
    const match1 = lookup(variant1);
    if (match1) return match1;

    const variant2 = template.replace(/\{(\d+)\}\s+%/g, '{$1}%');
    const match2 = lookup(variant2);
    if (match2) return match2;

    const variant3 = template.replace(/\{(\d+)\}\s+to\s+\{(\d+)\}/gi, '{$1} - {$2}');
    const match3 = lookup(variant3);
    if (match3) return match3;

    return null;
}


// ==========================================
// 4. 核心翻译引擎主函数
// ==========================================
function smartTranslate(rawText: string): string {
    if (!rawText || typeof rawText !== 'string') return rawText;

    const trimRaw = rawText.trim();
    if (!trimRaw || /^[\d\s.,%-]+$/.test(trimRaw)) return rawText;

    // ===== 1. 剥离颜色代码 =====
    const colorRegex = /\^[0-9]|\^x[0-9A-Fa-f]{6}/gi;
    let cleanText = rawText;
    let colorPrefix = "";
    
    const colorMatches = rawText.match(colorRegex);
    if (colorMatches && rawText.indexOf(colorMatches[0]) === 0) {
        colorPrefix = colorMatches[0];
        cleanText = rawText.substring(colorPrefix.length);
    } else {
        cleanText = rawText.replace(colorRegex, '');
    }
    
    // 修复 PoB 的缩写习惯，让其对齐标准字典 (如 Phys. -> Physical)
    let trimText = cleanText.trim().replace(/\bPhys\.\b/g, "Physical");
    if (!trimText) return rawText;

    // ===== 2. 垃圾碎片网 (阻断无意义文本) =====
    if (isIgnorable(trimText)) return rawText;

    // ===== 3. 特殊 UI 拼装与前缀硬编码 (极速秒杀) =====
    if (trimText.startsWith("Affix: ")) {
        return colorPrefix + trimText.replace("Affix: ", "词缀: ");
    }
    if (trimText.startsWith("Requires Level ")) {
        let req = trimText.replace("Requires Level", "需求 等级");
        req = req.replace(/Dex/g, "敏捷").replace(/Int/g, "智力").replace(/Str/g, "力量");
        return colorPrefix + req;
    }
    if (trimText.startsWith("Sockets: ")) {
        return colorPrefix + trimText.replace("Sockets:", "插槽:");
    }
    if (trimText.startsWith("Source: ")) {
        return colorPrefix + trimText.replace("Source:", "来源:");
    }
    
    // 秒杀所有的 +X 所有 XXX 技能石等级
    const gemRegex = /^\+([0-9\(\)-]+) to Level of all (.+?) Skill Gems$/;
    const gemMatch = trimText.match(gemRegex);
    if (gemMatch) {
        const num = gemMatch[1];
        const type = gemMatch[2];
        const typeMap: Record<string, string> = {
            "Fire": "火焰", "Cold": "冰霜", "Lightning": "闪电",
            "Physical": "物理", "Chaos": "混沌", "Minion": "召唤生物",
            "Spell": "法术", "Vaal": "瓦尔", "Bow": "弓", "Melee": "近战"
        };
        const zhType = typeMap[type] || lookup(type) || type;
        return colorPrefix + `+${num} 所有 ${zhType} 技能石等级`;
    }

    // ===== 4. 尝试：静态词极速匹配 =====
    const directMatch = lookup(trimText);
    if (directMatch) {
        if (isDebugHitOn()) console.log(`[翻译命中-静态] "${trimText}" → "${directMatch}"`);
        return colorPrefix + directMatch;
    }

    // ===== 5. 尝试：PoB 缝合怪面板特征提取 =====
    const pobStatMatch = translatePoBStatLine(trimText);
    if (pobStatMatch) {
        if (isDebugHitOn()) console.log(`[翻译命中-面板属性] "${trimText}" → "${pobStatMatch}"`);
        return colorPrefix + pobStatMatch;
    }

    // ===== 6. 尝试：数值正则模板生成与匹配 =====
    numberRegex.lastIndex = 0;
    if (numberRegex.test(trimText)) {
        numberRegex.lastIndex = 0;

        let template = "";
        let lastIndex = 0;
        let match;
        let idx = 0;
        const extractedNumbers: string[] = [];

        while ((match = numberRegex.exec(trimText)) !== null) {
            template += trimText.substring(lastIndex, match.index) + `{${idx}}`;
            extractedNumbers.push(match[0]);
            lastIndex = numberRegex.lastIndex;
            idx++;
        }
        template += trimText.substring(lastIndex);

        const templateMatch = tryTemplateVariants(template);
        if (templateMatch) {
            let translated = templateMatch;
            for (let i = 0; i < extractedNumbers.length; i++) {
                translated = translated.replace(`{${i}}`, extractedNumbers[i]);
            }
            if (isDebugHitOn()) console.log(`[翻译命中-模板] "${trimText}" → 模板 "${template}" → "${translated}"`);
            return colorPrefix + translated;
        }

        // 尝试 6.5：部分数字可能不是占位符 (降级匹配)
        if (extractedNumbers.length > 1) {
            for (let keepCount = extractedNumbers.length - 1; keepCount >= 1; keepCount--) {
                numberRegex.lastIndex = 0;
                let partialTemplate = "";
                let pLastIndex = 0;
                let pIdx = 0;
                let pMatch;
                const pNumbers: string[] = [];

                while ((pMatch = numberRegex.exec(trimText)) !== null) {
                    if (pIdx < keepCount) {
                        partialTemplate += trimText.substring(pLastIndex, pMatch.index) + `{${pIdx}}`;
                        pNumbers.push(pMatch[0]);
                    } else {
                        partialTemplate += trimText.substring(pLastIndex, pMatch.index) + pMatch[0];
                    }
                    pLastIndex = numberRegex.lastIndex;
                    pIdx++;
                }
                partialTemplate += trimText.substring(pLastIndex);

                const partialMatch = tryTemplateVariants(partialTemplate);
                if (partialMatch) {
                    let translated = partialMatch;
                    for (let i = 0; i < pNumbers.length; i++) {
                        translated = translated.replace(`{${i}}`, pNumbers[i]);
                    }
                    if (isDebugHitOn()) console.log(`[翻译命中-部分模板] "${trimText}" → "${translated}"`);
                    return colorPrefix + translated;
                }
            }
        }
        
        if (isDebugMissOn()) console.warn(`[翻译未命中-模板] 原文: "${trimText}" → 生成模板: "${template}"`);
    }

    // ===== 7. 尝试：去掉尾部括号内容再匹配 =====
    const withoutParens = trimText.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (withoutParens !== trimText) {
        const parenMatch = lookup(withoutParens);
        if (parenMatch) {
            if (isDebugHitOn()) console.log(`[翻译命中-去括号] "${trimText}" → "${parenMatch}"`);
            return colorPrefix + parenMatch;
        }
    }

    // ==========================================
    // 8. 终极漏网过滤与错题本记录
    // ==========================================

    // 屏蔽风味文本记录 (太长且以标点结尾的句子)
    if (trimText.length > 30 && /[.!?]$/.test(trimText)) {
        return rawText;
    }

    // 屏蔽 Canvas 测量宽度时产生的半截子碎话 (保持控制台极度清爽)
    if (/(?:of|per|and|to|the|max|on|physical|lightning|cold|fire|chaos|elemental|melee|cast|attack|hit|pool|shield|critical|strike|effective|increased|reduced|more|less|damage|rating|chance|multiplier|gem|gems|skill|skills|phys|ele|deal|have|with|from)$/i.test(trimText)) {
        return rawText; 
    }

    // 真正有价值的未命中，记录进错题本并打印
    if (isDebugMissOn()) {
        console.log(`%c[PoB 漏翻]%c "${trimText}"`, "color: #ff9800; font-weight: bold;", "color: inherit;");
    }
    missLog.add(trimText);

    return rawText;
}

// ==========================================
// Hook Canvas 劫持
// ==========================================
function hookCanvas(contextProto: any) {
    if (!contextProto) return;
    const originalFillText = contextProto.fillText;
    const originalMeasureText = contextProto.measureText;

    contextProto.fillText = function(text: string, x: number, y: number, maxWidth?: number) {
        originalFillText.call(this, smartTranslate(text), x, y, maxWidth);
    };

    contextProto.measureText = function(text: string) {
        return originalMeasureText.call(this, smartTranslate(text));
    };
}

if (typeof CanvasRenderingContext2D !== 'undefined') {
    hookCanvas(CanvasRenderingContext2D.prototype);
}
if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
    hookCanvas(OffscreenCanvasRenderingContext2D.prototype);
}

export default smartTranslate;