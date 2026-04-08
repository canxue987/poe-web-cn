import { useAuth0 } from "@auth0/auth0-react";
import { Driver } from "pob-driver/src/js/driver";
import type { RenderStats } from "pob-driver/src/js/renderer";
import { type Game, gameData } from "pob-game/src";
import { useEffect, useRef, useState } from "react";
import * as use from "react-use";
import { log, tag } from "../lib/logger";
import ErrorDialog from "./ErrorDialog";

const { useHash } = use;

export default function PoBWindow(props: {
  game: Game;
  version: string;
  onFrame: (at: number, time: number, stats?: RenderStats) => void;
  onTitleChange: (title: string) => void;
  onLayerVisibilityCallbackReady?: (callback: (layer: number, sublayer: number, visible: boolean) => void) => void;
  toolbarComponent?: React.ComponentType<{ position: "top" | "bottom" | "left" | "right"; isLandscape: boolean }>;
  onDriverReady?: (driver: Driver) => void;
}) {
  const auth0 = useAuth0();

  const container = useRef<HTMLDivElement>(null);
  const driverRef = useRef<Driver | null>(null);
  const onFrameRef = useRef(props.onFrame);
  const onTitleChangeRef = useRef(props.onTitleChange);
  const onLayerVisibilityCallbackReadyRef = useRef(props.onLayerVisibilityCallbackReady);

  // DOM Refs 用于丝滑更新进度，绕过 React 渲染卡顿
  const progressFillRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);

  onFrameRef.current = props.onFrame;
  onTitleChangeRef.current = props.onTitleChange;
  onLayerVisibilityCallbackReadyRef.current = props.onLayerVisibilityCallbackReady;

  const [token, setToken] = useState<string>();
  useEffect(() => {
    async function getToken() {
      if (auth0.isAuthenticated) {
        const t = await auth0.getAccessTokenSilently();
        setToken(t);
      }
    }
    getToken();
  }, [auth0, auth0.isAuthenticated]);

  const [hash, _setHash] = useHash();
  const [buildCode, setBuildCode] = useState("");
  useEffect(() => {
    if (hash.startsWith("#build=")) {
      const code = hash.slice("#build=".length);
      setBuildCode(code);
    } else if (hash.startsWith("#=")) {
      const code = hash.slice("#=".length);
      setBuildCode(code);
    }
  }, [hash]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [showErrorDialog, setShowErrorDialog] = useState(true);

  // ==========================================
  // 🚀 核心黑科技：芝诺渐近式模拟进度条
  // ==========================================
  useEffect(() => {
    if (!loading) return;

    let currentProgress = 0;
    const interval = setInterval(() => {
      // 距离 99% 越近，增加得越慢 (模拟真实下载中后期的解压/停顿感)
      const remaining = 99 - currentProgress;
      // 每次前进剩余距离的 4%，但至少前进 0.1%
      const step = Math.max(0.1, remaining * 0.04); 
      currentProgress += step;

      // 强行阻断在 99.9%，等待引擎真正 Ready
      if (currentProgress > 99.9) currentProgress = 99.9;

      if (progressFillRef.current && progressTextRef.current) {
        progressFillRef.current.style.width = `${currentProgress}%`;
        progressTextRef.current.innerText = `${Math.floor(currentProgress)}%`;
      }
    }, 150); // 每 150ms 刷新一次丝滑动画

    return () => clearInterval(interval);
  }, [loading]);
  // ==========================================

  useEffect(() => {
    if (driverRef.current && props.toolbarComponent) {
      driverRef.current.setExternalToolbarComponent(props.toolbarComponent);
    }
  }, [props.toolbarComponent]);

  useEffect(() => {
    const assetPrefix = `${__ASSET_PREFIX__}/games/${props.game}/versions/${props.version}`;
    log.debug(tag.pob, "loading assets from", assetPrefix);

    const _driver = new Driver("release", assetPrefix, {
      onError: error => {
        setError(error);
        setShowErrorDialog(true);
      },
      onFrame: (at, time, stats) => onFrameRef.current(at, time, stats),
      onFetch: async (url, headers, body) => {
        let rep = undefined;

        // =======================================
        // 尝试 1：直连（部分不限制 CORS 的网站）
        // =======================================
        try {
          const r = await fetch(url, { method: body ? "POST" : "GET", body, headers });
          if (r.ok || r.status < 500) {
            return { body: await r.text(), headers: Object.fromEntries(r.headers.entries()), status: r.status };
          }
        } catch (e) {
          log.debug(tag.pob, "直连失败，准备走私人代理");
        }

        // =======================================
        // 尝试 2：你的专属 Cloudflare 私人代理后端 (已升级 Cookie 穿透能力)
        // =======================================
        try {
          // 💡 提取被浏览器底层封禁的 Cookie 头，换个马甲（X-Proxy-Cookie）送出去
          let proxyHeaders = { ...headers };
          if (proxyHeaders["Cookie"] || proxyHeaders["cookie"]) {
              proxyHeaders["X-Proxy-Cookie"] = proxyHeaders["Cookie"] || proxyHeaders["cookie"];
              delete proxyHeaders["Cookie"];
              delete proxyHeaders["cookie"];
          }

          const r = await fetch("https://pob-proxy.ricardo7892212.workers.dev", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, headers: proxyHeaders, body }),
          });
          
          const text = await r.text();
          if (text.trim().startsWith("<")) {
              throw new Error("后端代理未正确部署，返回了 HTML");
          }
          rep = JSON.parse(text);
        } catch (e) {
          log.error(tag.pob, "底层代理异常", e);
          return { body: "Error creating link: Proxy failed.", headers: {}, status: 500 };
        }

        return rep;
      },
      onTitleChange: title => onTitleChangeRef.current(title),
    });

    driverRef.current = _driver;

    (async () => {
      try {
        await _driver.start({
          userDirectory: gameData[props.game].userDirectory,
          cloudflareKvPrefix: "/api/kv",
          cloudflareKvAccessToken: token,
          cloudflareKvUserNamespace: gameData[props.game].cloudflareKvNamespace,
        });
        
        if (buildCode) await _driver.loadBuildFromCode(buildCode);
        if (container.current) _driver.attachToDOM(container.current);
        if (props.toolbarComponent) _driver.setExternalToolbarComponent(props.toolbarComponent);

        onLayerVisibilityCallbackReadyRef.current?.((layer, sublayer, visible) => {
          _driver.setLayerVisible(layer, sublayer, visible);
        });

        props.onDriverReady?.(_driver);

        // 引擎加载完毕，让进度条瞬间满血 100% 后再消失
        if (progressFillRef.current && progressTextRef.current) {
          progressFillRef.current.style.width = `100%`;
          progressTextRef.current.innerText = `100%`;
        }
        
        // 稍微延迟 300ms 卸载 loading 界面，让用户看清 100%
        setTimeout(() => setLoading(false), 300);
        
      } catch (e) {
        setError(e);
        setShowErrorDialog(true);
        setLoading(false);
      }
    })();

    return () => {
      _driver.detachFromDOM();
      _driver.destory();
      driverRef.current = null;
      setLoading(true);
    };
  }, [props.game, props.version, token, buildCode]);

  if (error) {
    log.error(tag.pob, error);
    return (
      <div className="relative w-full h-full bg-black">
        {showErrorDialog && (
          <ErrorDialog
            error={error}
            onReload={() => window.location.reload()}
            onClose={() => setShowErrorDialog(false)}
          />
        )}
        <div ref={container} className="w-full h-full focus:outline-none bg-black" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* 💡 炫酷的进度条加载层 */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-300 z-50">
          <div className="w-72 md:w-96">
            <div className="flex justify-between items-end mb-3">
              <span className="text-primary font-bold tracking-widest text-lg">正在唤醒游戏引擎...</span>
              <span ref={progressTextRef} className="text-primary font-bold text-xl">0%</span>
            </div>
            
            <div className="w-full bg-base-100 rounded-full h-3 shadow-inner overflow-hidden border border-base-content/10">
              <div 
                ref={progressFillRef} 
                className="bg-primary h-3 rounded-full transition-all duration-[150ms] ease-linear shadow-[0_0_10px_rgba(var(--p),0.8)]" 
                style={{ width: "0%" }}
              />
            </div>
            
            <p className="text-xs text-base-content/50 mt-5 text-center animate-pulse">
              首次跨域组装核心数据包可能需要数秒，请耐心等待
            </p>
          </div>
        </div>
      )}

      {/* 游戏 Canvas 容器 */}
      <div
        ref={container}
        className={`w-full h-full focus:outline-none bg-black transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}