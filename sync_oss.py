import requests
import boto3
from botocore.config import Config
import json

# ================= 你的 Cloudflare R2 配置区 =================
# 对照你截图中的【访问密钥 ID】
ACCESS_KEY_ID = '7325109e2e9f8a30c6598490f895c510'

# 对照你截图中的【机密访问密钥】
ACCESS_KEY_SECRET = 'b3fb484bbf7e1eb4602903af5b9e81bb4f55e08f84aecc6f36a4aba74317b69a'

# 填入你在 R2 创建的真实桶名称 (如果你建的不是这个名字，请修改)
BUCKET_NAME = 'pob-assets'

# 对照你截图最下方的【终结点 (默认)】 (直接整段粘贴，不需要自己去拼 Account ID 了)
ENDPOINT = 'https://a797cd8fb648e60a87ffb48738d15082.r2.cloudflarestorage.com'
# =============================================================

BASE_URL = 'https://asset.pob.cool'

# 初始化 S3 客户端 (连接到 R2)
s3 = boto3.client(
    's3',
    endpoint_url=ENDPOINT,
    aws_access_key_id=ACCESS_KEY_ID,
    aws_secret_access_key=ACCESS_KEY_SECRET,
    # R2 强制要求使用 s3v4 签名版本
    config=Config(signature_version='s3v4'),
    # region 随便填，R2 是全球分布的，但 boto3 需要这个参数不报错
    region_name='auto' 
)

def download_and_upload(filepath):
    print(f"📥 正在从原版服务器下载 {filepath} ...")
    
    # 构建完美的浏览器伪装头
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://pob.cool/',
        'Origin': 'https://pob.cool',
        'Accept-Encoding': 'gzip, deflate, br' # 声明支持压缩，降低被墙的概率
    }
    
    try:
        # 加入 headers 和 60 秒的超时等待，防止大文件卡死
        res = requests.get(f"{BASE_URL}/{filepath}", headers=headers, timeout=60)
        
        if res.status_code == 200:
            print(f"📤 下载完成，正在推送到 Cloudflare R2 ...")
            
            upload_kwargs = {
                'Bucket': BUCKET_NAME,
                'Key': filepath,
                'Body': res.content,
                'CacheControl': 'public, max-age=2592000'
            }
            
            if filepath.endswith('.zip'):
                upload_kwargs['ContentType'] = 'application/zip'
            elif filepath.endswith('.json'):
                upload_kwargs['ContentType'] = 'application/json'
                
            s3.put_object(**upload_kwargs)
            print(f"✅ {filepath} 同步成功！\n")
        else:
            print(f"⚠️ {filepath} 不存在 (状态码: {res.status_code})，跳过。\n")
            
    except Exception as e:
        print(f"❌ 下载或上传 {filepath} 时发生错误: {str(e)}\n")

if __name__ == '__main__':
    print("🚀 开始执行 POB -> R2 资源全自动同步脚本...\n")
    
    # 1. 获取寻宝图 (version.json)
    print("📥 获取 version.json...")
    v_res = requests.get(f"{BASE_URL}/version.json")
    v_data = v_res.json()
    s3.put_object(
        Bucket=BUCKET_NAME, 
        Key='version.json', 
        Body=v_res.content, 
        ContentType='application/json',
        CacheControl='no-cache' # version.json 需要保持最新，不缓存
    )
    print("✅ version.json 同步成功！\n")

    files_to_sync = []
    
    # 2. 完美组装抓包到的真实路径
    for game, info in v_data.items():
        head_ver = info.get('head')
        if head_ver:
            files_to_sync.append(f"games/{game}/versions/{head_ver}/root.zip")
            files_to_sync.append(f"games/{game}/versions/{head_ver}/tree.zip")

    print(f"🔍 解析到以下绝对真实路径，准备突入:\n{files_to_sync}\n")

    # 3. 开始无情搬运
    for f in files_to_sync:
        download_and_upload(f)

    print("🎉 所有核心资源已成功搬运至 Cloudflare R2！流量自由节点已就绪！")