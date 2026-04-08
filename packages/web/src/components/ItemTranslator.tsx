import { useState } from "react";
import { LanguageIcon, ArrowsRightLeftIcon, CheckCircleIcon } from "@heroicons/react/24/solid";

// 💡 【修正】：完全按照官方文档的真实 API 导入
import { TranslatorFactory } from "cn-poe-utils/translator/zh2en";

export function ItemTranslator({ position, isLandscape }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [cnItemText, setCnItemText] = useState("");
  const [enItemText, setEnItemText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    if (!cnItemText) return;
    
    setIsTranslating(true);
    setError("");
    
    try {
      // ==========================================
      // 🚀 核心实验室：真实接入 cn-poe-utils 文本翻译
      // ==========================================
      
      // 1. 实例化翻译器工厂
      const factory = new TranslatorFactory();
      
      // 2. 召唤“文本翻译器” (getTextTranslator)
      const textTranslator = factory.getTextTranslator();
      
      // 3. 一键将国服装备文本翻译成纯正的英文 PoB 代码
      const englishText = textTranslator.trans(cnItemText);
      
      // ==========================================
      
      if (!englishText) {
        throw new Error("翻译结果为空，可能是无法识别的格式");
      }
      
      setEnItemText(englishText);
      
    } catch (e: any) {
      console.error("翻译失败", e);
      setError(e.message || "翻译解析失败，该物品可能含有无法识别的词缀。");
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = () => {
    if (enItemText) {
      navigator.clipboard.writeText(enItemText);
      alert("英文装备代码已复制！请直接在 PoB 的 Items 页面中 Ctrl+V 粘贴。");
    }
  };

  // ... 下面的 render (UI) 部分保持原样，不需要任何改动
  return (
    <>
      <button className="btn btn-square btn-ghost" onClick={() => setIsOpen(true)} title="装备翻译实验室">
        <LanguageIcon className="size-6 text-accent" />
      </button>
      
      <dialog className={`modal ${isOpen ? "modal-open" : ""}`} onClick={() => setIsOpen(false)}>
        <div className="modal-box bg-base-200 border border-slate-700 max-w-3xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-2xl text-primary mb-4 flex items-center gap-2">
            <LanguageIcon className="size-6" /> 国服装备翻译引擎
          </h3>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="label-text font-bold text-slate-300">在此粘贴国服装备文本 (Ctrl+C 复制的中文)</label>
              <textarea 
                className="textarea textarea-bordered w-full h-64 font-mono text-xs bg-base-100 placeholder-slate-600 focus:border-primary transition-colors"
                placeholder="例如：\n稀有度: 稀有\n断金之刃\n伤害提高..."
                value={cnItemText}
                onChange={(e) => setCnItemText(e.target.value)}
              />
            </div>

            <div className="flex flex-col items-center justify-center pt-6">
              <button 
                className={`btn btn-circle btn-primary ${isTranslating ? "loading" : ""}`}
                onClick={handleTranslate}
                disabled={!cnItemText || isTranslating}
                title="转换为标准英文"
              >
                <ArrowsRightLeftIcon className="size-6" />
              </button>
            </div>

            <div className="flex-1 space-y-2">
              <label className="label-text font-bold text-slate-300">标准的英文 PoB 代码</label>
              <textarea 
                className={`textarea w-full h-64 font-mono text-xs bg-base-300 ${error ? 'border-error text-error' : 'border-slate-700 text-green-400'}`}
                readOnly
                value={error ? `[解析错误]\n${error}` : enItemText}
                placeholder="翻译后的结果将显示在这里..."
              />
            </div>
          </div>
          
          <div className="modal-action flex justify-between mt-6">
            <button 
              className="btn btn-accent" 
              onClick={copyToClipboard}
              disabled={!enItemText || !!error}
            >
              <CheckCircleIcon className="size-5" /> 复制并去 PoB 粘贴
            </button>
            <button className="btn btn-ghost" onClick={() => setIsOpen(false)}>关闭</button>
          </div>
        </div>
      </dialog>
    </>
  );
}