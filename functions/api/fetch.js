export async function onRequest(context) {
  const { request } = context;

  // 1. 处理预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      }
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // 2. 解析前端的需求
    const payload = await request.json();
    const targetUrl = Array.isArray(payload) ? payload[0] : payload.url;
    const fetchOptions = Array.isArray(payload) ? payload[1] : payload.options;

    // 3. 去 pobb.in 拿最原始的数据
    const response = await fetch(targetUrl, fetchOptions);
    const bodyText = await response.text();

    // 🔥 4. 核心修复：把原始数据装进前端要求的 JSON 包装盒里！
    const proxyData = {
      body: bodyText,
      status: response.status,
      statusText: response.statusText,
      // 把请求头转成二维数组格式，这是 pob-web 前端严格要求的格式
      headers: Array.from(response.headers.entries())
    };

    // 5. 把 JSON 盒子送回给浏览器
    return new Response(JSON.stringify(proxyData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}