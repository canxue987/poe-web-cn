import * as path from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, normalizePath, searchForWorkspaceRoot } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const rootDir = path.resolve(__dirname, "../..");
const packerR2Dir = path.resolve(__dirname, "../packer/r2");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    proxy: {
      "/api": "http://localhost:8788",
    },
    sourcemapIgnoreList(file) {
      return file.includes("node_modules") || file.includes("logger.ts");
    },
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), rootDir],
    },
    // Owner's Cloudflare Tunnel domain for mobile testing
    allowedHosts: ["local.pob.cool"],
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  },
  build: {
    chunkSizeWarningLimit: 1024,
    sourcemap: true,
    ssr: false,
  },
  // define: {
  //   APP_VERSION: JSON.stringify(process.env.npm_package_version),
  //   __VERSION_URL__: JSON.stringify(
  //     mode === "development" && process.env.POB_COOL_ASSET === undefined
  //       ? `/@fs/${rootDir}/version.json`
  //       : "https://pobzh-assets.oss-cn-qingdao.aliyuncs.com/version.json", // 👈 已经指向你的青岛节点
  //   ),
  //   __ASSET_PREFIX__: JSON.stringify(
  //     mode === "development" && process.env.POB_COOL_ASSET === undefined
  //       ? `/@fs/${packerR2Dir}`
  //       : "https://pobzh-assets.oss-cn-qingdao.aliyuncs.com", // 👈 已经指向你的青岛节点 (注意末尾不带斜杠)
  //   ),
  // },

  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
    __VERSION_URL__: JSON.stringify(
      mode === "development" && process.env.POB_COOL_ASSET === undefined
        ? `/@fs/${rootDir}/version.json`
        : "https://assets.pobzh.cn/version.json", // 👈 完美使用你的专属自定义域名
    ),
    __ASSET_PREFIX__: JSON.stringify(
      mode === "development" && process.env.POB_COOL_ASSET === undefined
        ? `/@fs/${packerR2Dir}`
        : "https://assets.pobzh.cn", // 👈 完美使用你的专属自定义域名
    ),
  },

//   define: {
//     APP_VERSION: JSON.stringify(process.env.npm_package_version),
//     __VERSION_URL__: JSON.stringify(
//       mode === "development" && process.env.POB_COOL_ASSET === undefined
//         ? `/@fs/${rootDir}/version.json`
//         : "/proxy/version.json", // 👈 修改：生产环境指向你的 CF 代理路由
//     ),
//     __ASSET_PREFIX__: JSON.stringify(
//       mode === "development" && process.env.POB_COOL_ASSET === undefined
//         ? `/@fs/${packerR2Dir}`
//         : "/proxy", // 👈 修改：生产环境前缀指向你的 CF 代理路由 (保持不带结尾斜杠)
//     ),
//   },

  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["@bokuweb/zstd-wasm"],
    esbuildOptions: {
      target: "es2020",
    },
  },
plugins: [
    reactRouter(),
    tailwindcss(),
    // 终极精确抓取：只拿 release 目录下的 .mjs 和 .wasm，绝对不碰任何 debug 文件！
  ],
}));