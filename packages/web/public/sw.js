const CACHE_NAME = 'pob-assets-v2'; // 升级为 v2，触发浏览器更新 SW

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('[Service Worker] 已安装 v2');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.log('[Service Worker] 已激活并接管页面');
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 🎯 拦截引擎核心请求
  if (url.includes('/games/') && (url.endsWith('root.zip') || url.endsWith('.wasm'))) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // 1. 命中缓存：直接光速返回
        if (cachedResponse) {
          console.log('🚀 [Service Worker] 极速命中本地缓存:', url);
          return cachedResponse;
        }

        // 2. 未命中：去网络拉取新版本
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME).then((cache) => {
              // 💡 核心黑科技：动态垃圾回收 (Garbage Collection)
              // 在存入新版本之前，先找出同游戏的旧版本并干掉它！
              cache.keys().then((requests) => {
                requests.forEach((req) => {
                  const cachedUrl = req.url;
                  // 判断依据：都是 root.zip，且属于同一个游戏 (比如都是 poe1)，但 URL 不一样 (说明版本更新了)
                  if (
                    cachedUrl.endsWith('root.zip') && 
                    cachedUrl !== url &&
                    ((cachedUrl.includes('/poe1/') && url.includes('/poe1/')) || 
                     (cachedUrl.includes('/poe2/') && url.includes('/poe2/')) || 
                     (cachedUrl.includes('/le/') && url.includes('/le/')))
                  ) {
                    console.log('🗑️ [Service Worker] 发现过期旧版本，正在清除:', cachedUrl);
                    cache.delete(req);
                  }
                });
              });

              // 将最新版本锁入硬盘
              cache.put(event.request, responseToCache);
              console.log('💾 [Service Worker] 新版本大文件已永久锁入本地硬盘:', url);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});