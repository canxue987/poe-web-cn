import { useState } from "react";
import { 
  BookmarkSquareIcon, ArrowDownTrayIcon, CheckCircleIcon, 
  ExclamationTriangleIcon, ClipboardDocumentCheckIcon, DocumentDuplicateIcon
} from "@heroicons/react/24/solid";
import { TranslatorFactory } from "cn-poe-utils/translator/zh2en";
import { transform } from "cn-poe-utils/building";
import pako from "pako";

// 1. 书签提取脚本
const EXTRACT_SCRIPT = `fetch('/character-window/get-characters').then(r=>r.json()).then(c=>{if(!c||!c.length)return alert("未找到角色");let o=document.createElement("div");o.style="position:fixed;inset:0;background:#000000cc;z-index:9999;display:flex;align-items:center;justify-content:center";let b=document.createElement("div");b.style="background:#fff;padding:20px;border-radius:8px;text-align:center;color:#000;font-family:sans-serif";b.innerHTML="<h3 style='margin:0 0 15px'>请选择要导出的角色</h3>";let s=document.createElement("select");s.style="padding:8px;width:100%;margin-bottom:15px;font-size:14px";c.forEach(x=>{let p=document.createElement("option");p.value=x.name;p.innerText=\`\${x.name} (Lv.\${x.level} \${x.class})\`;s.appendChild(p)});let btn=document.createElement("button");btn.style="padding:8px 16px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-right:10px";btn.innerText="获取并复制数据";let cls=document.createElement("button");cls.style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;cursor:pointer";cls.innerText="取消";cls.onclick=()=>o.remove();btn.onclick=async()=>{btn.innerText="拉取中...";btn.disabled=true;let n=s.value;let[i,p]=await Promise.all([fetch('/character-window/get-items?character='+encodeURIComponent(n)).then(r=>r.json()),fetch('/character-window/get-passive-skills?character='+encodeURIComponent(n)).then(r=>r.json())]);let d=JSON.stringify({items:i,passiveSkills:p});try{await navigator.clipboard.writeText(d);alert("✅ 已成功复制到剪贴板！")}catch(e){let t=document.createElement("textarea");t.value=d;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove();alert("✅ 提取完成！")}o.remove()};b.append(s,btn,cls);o.appendChild(b);document.body.appendChild(o)});`;
const BOOKMARKLET_HREF = `javascript:(function(){${encodeURIComponent(EXTRACT_SCRIPT)}})();`;

export function TencentImportButton({ position, isLandscape }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [rawJsonText, setRawJsonText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pobCode, setPobCode] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const resetModal = () => {
    setIsOpen(false);
    setTimeout(() => {
      setRawJsonText("");
      setPobCode("");
      setSuccess(false);
      setIsCopied(false);
    }, 300); 
  };

  const handleConvert = async () => {
    if (!rawJsonText) return;
    
    setIsLoading(true);
    setPobCode(""); 
    try {
      const rawData = JSON.parse(rawJsonText);
      if (!rawData.items || !rawData.passiveSkills) {
        throw new Error("数据格式不正确，缺少 items 或 passiveSkills");
      }

      // Step 1: 翻译 JSON 数据
      const factory = new TranslatorFactory();
      const jsonTranslator = factory.getJsonTranslator();
      jsonTranslator.transItems(rawData.items);
      jsonTranslator.transPassiveSkills(rawData.passiveSkills);
      
      // Step 2: 核心转换
      const building = transform(rawData.items, rawData.passiveSkills);

      // Step 3: 💡 最核心的一步：直接使用 .toString() 获取完美的 XML 字符串
      const xmlString = building.toString();

      // Step 4: 压缩生成 eJz 分享码
      const textEncoder = new TextEncoder();
      const xmlUint8Array = textEncoder.encode(xmlString);
      const compressedData = pako.deflate(xmlUint8Array);
      
      // 不使用 Buffer 的跨平台 Base64 转换
      let binary = "";
      const len = compressedData.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(compressedData[i]);
      }
      const finalPobCode = window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_");
      
      setPobCode(finalPobCode);
      setSuccess(true);
      
    } catch (e: any) {
      console.error("转换过程发生错误:", e);
      alert("解析失败，请检查数据是否完整！\n错误详情：" + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!pobCode) return;
    try {
      await navigator.clipboard.writeText(pobCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); 
    } catch (err) {
      alert("复制失败，请手动选择代码框内容进行复制。");
    }
  };

  return (
    <>
      <button className="btn btn-square btn-ghost" onClick={() => setIsOpen(true)} title="生成国服PoB码">
        <BookmarkSquareIcon className="size-6 text-accent" />
      </button>
      
      <dialog className={`modal ${isOpen ? "modal-open" : ""}`} onClick={resetModal}>
        <div className="modal-box bg-base-200 border border-slate-700 max-w-3xl" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={resetModal}>✕</button>
          
          <h3 className="font-bold text-2xl text-primary mb-4 flex items-center gap-2">
            <ArrowDownTrayIcon className="size-6" />
            国服数据转换器
          </h3>
          
          <div className="space-y-6 text-slate-300">
            <div className="bg-base-300 p-4 rounded-lg shadow-inner border border-base-100">
              <h4 className="font-bold text-white mb-3 text-lg">Step 1：获取国服数据 (推荐书签法)</h4>
              <div className="flex flex-col md:flex-row items-center gap-4 bg-base-100 p-4 rounded-md border border-dashed border-primary/50">
                <a 
                  href={BOOKMARKLET_HREF}
                  className="btn btn-primary cursor-grab shadow-lg hover:scale-105 transition-transform shrink-0"
                  onClick={(e) => e.preventDefault()} 
                  title="请按住我，拖拽到浏览器的书签栏"
                >
                  <BookmarkSquareIcon className="size-5 mr-1" />
                  PoE国服导出工具
                </a>
                <div className="text-sm space-y-1">
                  <p>1. 鼠标按住左侧按钮，<strong>拖拽到浏览器书签栏</strong>放开。</p>
                  <p>2. 登录 <a href="https://poe.qq.com" target="_blank" rel="noreferrer" className="text-primary underline hover:text-primary-focus transition-colors">国服官网 (poe.qq.com)</a>。</p>
                  <p>3. 点击书签栏的 <strong>"PoE国服导出工具"</strong> 获取数据！</p>
                </div>
              </div>
            </div>

            <div className="bg-base-300 p-4 rounded-lg shadow-inner border border-base-100">
              <h4 className="font-bold text-white mb-2 text-lg">Step 2：一键生成 PoB 码</h4>
              
              {!success ? (
                <>
                  <textarea 
                    className="textarea textarea-bordered w-full h-32 font-mono text-xs bg-base-100 placeholder-slate-600 focus:border-primary"
                    placeholder="在此粘贴 JSON 数据 (以 {&quot;items&quot;:... 开头)"
                    value={rawJsonText}
                    onChange={(e) => setRawJsonText(e.target.value)}
                  />
                  <div className="mt-4 flex justify-end">
                    <button 
                      className={`btn btn-primary ${isLoading ? "loading" : ""}`}
                      onClick={handleConvert}
                      disabled={!rawJsonText || isLoading}
                    >
                      翻译并生成分享码
                    </button>
                  </div>
                </>
              ) : (
                <div className="animate-fade-in transition-all">
                  <div className="alert alert-success shadow-lg mb-4 text-white">
                    <div>
                      <CheckCircleIcon className="size-6" />
                      <span>转换成功！请复制下方的 PoB 代码并前往导入。</span>
                    </div>
                  </div>
                  
                  <div className="form-control w-full relative">
                    <textarea 
                      readOnly
                      className="textarea textarea-bordered w-full h-24 font-mono text-xs bg-base-100/50 text-slate-400 resize-none pr-32"
                      value={pobCode}
                    />
                    <button 
                      className={`absolute bottom-3 right-3 btn btn-sm ${isCopied ? "btn-success text-white" : "btn-secondary"}`}
                      onClick={handleCopyCode}
                    >
                      {isCopied ? <><ClipboardDocumentCheckIcon className="size-4 mr-1"/> 已复制</> : <><DocumentDuplicateIcon className="size-4 mr-1"/> 一键复制</>}
                    </button>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button className="btn btn-ghost" onClick={() => { setSuccess(false); setRawJsonText(""); setPobCode(""); }}>
                      转换下一个角色
                    </button>
                    <button className="btn btn-primary ml-2" onClick={resetModal}>
                      关闭窗口
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}