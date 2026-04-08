import os
import csv
import json

csv_folder = './csv_dict'
output_file = './packages/web/src/zh_dict.json'
output_driver_file = './packages/driver/src/js/zh_dict.json'

final_dict = {}

def process_pair(eng_text, chn_text):
    eng_text = eng_text.strip()
    chn_text = chn_text.strip()
    if not eng_text or eng_text == 'Index' or eng_text == 'English':
        return

    # 🔥 核心：将 PoeCharm 的 # 统一转换为标准的 {0}, {1} 模板
    if '#' in eng_text:
        parts_eng = eng_text.split('#')
        eng_tmpl = parts_eng[0]
        for i in range(1, len(parts_eng)):
            eng_tmpl += f"{{{i-1}}}" + parts_eng[i]

        parts_chn = chn_text.split('#')
        chn_tmpl = parts_chn[0]
        for i in range(1, len(parts_chn)):
            if i < len(parts_chn):
                chn_tmpl += f"{{{i-1}}}" + parts_chn[i]

        final_dict[eng_tmpl] = chn_tmpl
    else:
        # 如果本来就带有 {0} 或者纯静态词，直接存入
        final_dict[eng_text] = chn_text

for filename in os.listdir(csv_folder):
    if filename.endswith('.csv'):
        filepath = os.path.join(csv_folder, filename)
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 2 and row[0].strip() != '':
                    # 自动处理换行符
                    eng = row[0].strip().replace('\\n', '\n')
                    chn = row[1].strip().replace('\\n', '\n')

                    if '\n' in eng and '\n' in chn:
                        eng_lines = eng.split('\n')
                        chn_lines = chn.split('\n')
                        if len(eng_lines) == len(chn_lines):
                            for el, cl in zip(eng_lines, chn_lines):
                                process_pair(el, cl)
                        else:
                            process_pair(eng, chn)
                    else:
                        process_pair(eng, chn)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(final_dict, f, ensure_ascii=False, indent=2)

with open(output_driver_file, 'w', encoding='utf-8') as f:
    json.dump(final_dict, f, ensure_ascii=False, indent=2)

print(f"🔥 炼丹完成！回归大道至简：共生成了 {len(final_dict)} 条极速 O(1) 模板词条！")