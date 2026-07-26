#!/usr/bin/env bash
# 把旗舰 1001 的图片上传到腾讯云 COS（沿用 1001fish 的方案）。
# 用法（密钥只存在于你的终端环境，不写进任何文件、不进 git）：
#   COS_SECRET_ID=xxx COS_SECRET_KEY=yyy bash upload_cos.sh
set -u
cd "$(dirname "$0")"

if [ -z "${COS_SECRET_ID:-}" ] || [ -z "${COS_SECRET_KEY:-}" ]; then
  echo "缺少 COS_SECRET_ID / COS_SECRET_KEY 环境变量"; exit 1
fi

BIG=$(ls images/*.jpg 2>/dev/null | wc -l)
THUMB=$(ls images/t/*.jpg 2>/dev/null | wc -l)
echo "=== 1001birds → COS 迁移 ==="
echo "大图 $BIG 张 → birds/ ；缩略图 $THUMB 张 → birds/t/"
echo

echo "[1/2] 上传大图…"
python cos_upload.py images birds --workers 6 || exit 1
echo
echo "[2/2] 上传缩略图…"
python cos_upload.py images/t birds/t --workers 6 || exit 1

echo
echo "=== 抽查线上可访问性（含 1 张 PNG，验证 Content-Type）==="
for f in 1.jpg 8.png 500.jpg 1001.jpg; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://pic-1302017848.cos.ap-nanjing.myqcloud.com/birds/$f")
  ct=$(curl -s -o /dev/null -w "%{content_type}" "https://pic-1302017848.cos.ap-nanjing.myqcloud.com/birds/$f")
  t=$(curl -s -o /dev/null -w "%{http_code}" "https://pic-1302017848.cos.ap-nanjing.myqcloud.com/birds/t/$f")
  echo "  $f  大图:$code ($ct)  缩略图:$t"
done
echo
echo "上传完成。回到 Claude 说一声，我来切换 IMG_BASE 并上线。"
