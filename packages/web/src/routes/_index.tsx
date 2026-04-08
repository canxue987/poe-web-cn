import {
  ArchiveBoxIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import localizedFormat from "dayjs/plugin/localizedFormat";
import utc from "dayjs/plugin/utc";
import { gameData } from "pob-game/src";
// import React from "react";
import { Link, redirect } from "react-router";
import type { Route } from "../routes/+types/_index";
import type { Games } from "./_game";
import React, { useEffect } from "react";
dayjs.extend(utc);
dayjs.extend(localeData);
dayjs.extend(localizedFormat);

export async function clientLoader(args: Route.ClientLoaderArgs) {
  // Redirect if the landing from the pobb.in
  if (location.hash.startsWith("#build=")) {
    return redirect(`/poe1#${location.hash.slice("#build".length)}`);
  }

  const rep = await fetch(__VERSION_URL__);
  return (await rep.json()) as Games;
}

export default function Index({ loaderData }: Route.ComponentProps) {
  
  // 💡 注入 Service Worker：赋予网页 PWA 级别的离线缓存能力
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('🛡️ Service Worker 注册成功，大文件拦截准备就绪'))
        .catch((err) => console.error('Service Worker 注册失败:', err));
    }
  }, []);

  function versionTable(game: keyof Games) {
    return (
      <div className="card bg-base-100 shadow-md p-4 w-full">
        <h3 className="text-2xl font-semibold mb-4 text-center">{gameData[game].name}</h3>
        <div className="overflow-auto max-h-96">
          <table className="table w-full">
            <thead>
              <tr>
                <th>版本</th>
                <th>发布日期</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loaderData[game].versions.map(_ => (
                <tr key={_.value}>
                  <td>{_.value}</td>
                  <td>{dayjs.utc(_.date).local().format("ll")}</td>
                  <td>
                    <Link to={`/${game}/versions/${_.value}`} className="btn btn-primary btn-xs">
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 头部区域 (Hero Section) */}
      <section className="hero min-h-160" style={{ backgroundImage: "url('/hero-bg.webp')" }} data-theme="dark">
        <div className="hero-overlay backdrop-blur-xs" />
        <div className="hero-content text-center flex flex-col items-center z-10">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold mb-5">PoB 网页汉化版</h1>
            <p className="mb-5 text-xl">
              随时随地，在浏览器中极速构建和探索你的流放之路BD。
            </p>
          </div>

          {/* 三大游戏核心入口 */}
          <div className="flex flex-col md:flex-row gap-8 mt-4">
            {/* PoE2 Card */}
            <div className="card w-64 bg-base-100 shadow-md p-4 transition-all hover:shadow-lg hover:-translate-y-1">
              <span className="min-h-44 flex items-center justify-center">
                <img src="/logo-poe2.webp" alt="Path of Exile 2" className="mx-auto" />
              </span>
              <Link to="/poe2" className="btn btn-primary btn-block">
                启动 流放之路 2 <ArrowRightIcon className="size-4" />
              </Link>
            </div>
            {/* PoE1 Card */}
            <div className="card w-64 bg-base-100 shadow-md p-4 transition-all hover:shadow-lg hover:-translate-y-1">
              <span className="min-h-44 flex items-center justify-center">
                <img src="/logo-poe1.webp" alt="Path of Exile 1" className="mx-auto" />
              </span>
              <Link to="/poe1" className="btn btn-primary btn-block">
                启动 流放之路 1 <ArrowRightIcon className="size-4" />
              </Link>
            </div>
            {/* LE Card */}
            <div className="card w-64 bg-base-100 shadow-md p-4 transition-all hover:shadow-lg hover:-translate-y-1">
              <span className="min-h-44 flex items-center justify-center">
                <img src="/logo-le.png" alt="Last Epoch" className="mx-auto" />
              </span>
              <Link to="/le" className="btn btn-primary btn-block">
                启动 最后纪元 <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 新增：网址聚合（流放神器）区域 */}
      <section className="py-12 px-4 bg-base-100">
        <h2 className="text-3xl font-bold text-center mb-8">
          <SparklesIcon className="size-8 mr-2 inline text-accent" />
          常用流放神器
        </h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* PoEDB */}
          <a href="https://poedb.tw/cn/" target="_blank" rel="noreferrer" 
             className="card bg-base-200 shadow-sm p-6 hover:shadow-md hover:ring-2 hover:ring-primary transition-all cursor-pointer">
            <h3 className="text-xl font-bold mb-2">PoEDB (编年史)</h3>
            <p className="text-sm text-base-content/70">全网最权威的中文数据库，查词缀、查掉落、解析游戏机制必备。</p>
          </a>

          {/* poe.ninja */}
          <a href="https://poe.ninja/" target="_blank" rel="noreferrer" 
             className="card bg-base-200 shadow-sm p-6 hover:shadow-md hover:ring-2 hover:ring-secondary transition-all cursor-pointer">
            <h3 className="text-xl font-bold mb-2">poe.ninja</h3>
            <p className="text-sm text-base-content/70">实时经济物价走势，天梯最热门 BD 数据统计与抄作业神器。</p>
          </a>

          {/* Craft of Exile */}
          <a href="https://www.craftofexile.com/" target="_blank" rel="noreferrer" 
             className="card bg-base-200 shadow-sm p-6 hover:shadow-md hover:ring-2 hover:ring-accent transition-all cursor-pointer">
            <h3 className="text-xl font-bold mb-2">Craft of Exile</h3>
            <p className="text-sm text-base-content/70">最强做装模拟器，化石、精华、收获做装概率精确计算与步骤模拟。</p>
          </a>

        </div>
      </section>

      {/* 历史版本列表 */}
      <section className="py-12 px-4 bg-base-200 flex-grow">
        <h2 className="text-3xl font-bold text-center mb-8">
          <ArchiveBoxIcon className="size-8 mr-2 inline text-primary" />
          引擎历史版本存档
        </h2>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
          {/* PoE2 Versions Table */}
          {versionTable("poe2")}

          {/* PoE1 Versions Table */}
          {versionTable("poe1")}

          {/* LE Versions Table */}
          {versionTable("le")}
        </div>
      </section>

      {/* 底部版权信息 */}
      <footer className="footer footer-center flex items-center p-8 bg-base-300 text-base-content">
        <aside className="flex-1">
          <span>
            © 2026 基于原作者 Koji AGAWA (
            <a className="link" href="https://x.com/atty303" target="_blank" rel="noreferrer">
              @atty303
            </a>
            ) 的开源项目。深度汉化与国内高速网络优化版。本工具与 Grinding Gear Games 无任何关联。
          </span>
        </aside>
        <div className="flex-none">
          <a href="https://github.com/atty303/poe-web" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 98 96">
              <title>原版 GitHub 仓库</title>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
              />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}