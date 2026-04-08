export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = new URL(url.pathname.replace(/^\/proxy/, ''), 'https://asset.pob.cool');
  targetUrl.search = url.search;

  // 1. 构建干净的请求头（不要把浏览器乱七八糟的压缩要求带过去，防止目标服务器混淆）
  const requestHeaders = new Headers();
  requestHeaders.set('Origin', 'https://pob.cool');
  requestHeaders.set('Referer', 'https://pob.cool/');
  requestHeaders.set('User-Agent', context.request.headers.get('User-Agent') || 'Mozilla/5.0');

  const init = {
    method: context.request.method,
    headers: requestHeaders,
  };
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    init.body = context.request.body;
  }

  // 2. 去官方服务器拉取数据
  const response = await fetch(targetUrl.href, init);
  
  // 3. 构建返回给浏览器的响应头
  const newHeaders = new Headers(response.headers);
  newHeaders.delete('content-encoding'); // 彻底删除，防止文件解压损坏
  newHeaders.set('Access-Control-Allow-Origin', '*');
  
  // 🔥 4. 智能缓存：只有当请求完全成功 (状态码 200) 时，才允许缓存！
  // 绝对不缓存报错页面！
  if (response.status === 200) {
    newHeaders.set('Cache-Control', 'public, max-age=2592000');
  } else {
    newHeaders.set('Cache-Control', 'no-store, max-age=0');
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}