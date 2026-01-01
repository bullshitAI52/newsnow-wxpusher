import { consola } from "consola"
import type { SourceID, SourceResponse } from "../shared/types"

// 从环境变量获取配置
const WXPUSHER_APP_TOKEN = process.env.WXPUSHER_APP_TOKEN
const WXPUSHER_USER_ID = process.env.WXPUSHER_USER_ID
const BASE_URL = process.env.BASE_URL || "https://newsnow.busiyi.world"
const SOURCE_IDS = (process.env.SOURCE_IDS || "weibo,zhihu,baidu,bilibili,toutiao,douyin,hupu,tieba,ithome,github").split(",") as SourceID[]
const MAX_ITEMS_PER_SOURCE = parseInt(process.env.MAX_ITEMS_PER_SOURCE || "5", 10)

// 验证配置
if (!WXPUSHER_APP_TOKEN || !WXPUSHER_USER_ID) {
  consola.error("请设置环境变量 WXPUSHER_APP_TOKEN 和 WXPUSHER_USER_ID")
  process.exit(1)
}

// wxpusher API
const WXPUSHER_API_URL = "https://wxpusher.zjiecode.com/api/send/message"

async function sendToWxPusher(content: string, summary?: string): Promise<boolean> {
  try {
    const response = await fetch(WXPUSHER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        appToken: WXPUSHER_APP_TOKEN,
        content,
        summary: summary || "新闻推送",
        contentType: 3, // 3表示markdown
        uids: [WXPUSHER_USER_ID]
      })
    })
    const result = await response.json()
    if (result.code === 1000) {
      consola.success("消息推送成功")
      return true
    } else {
      consola.error(`推送失败: ${result.msg}`)
      return false
    }
  } catch (error) {
    consola.error("推送请求失败:", error)
    return false
  }
}

async function fetchSourceData(sourceId: SourceID): Promise<any[]> {
  try {
    const url = `${BASE_URL}/api/s?id=${sourceId}&latest=true`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10秒超时
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    clearTimeout(timeout)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const data: SourceResponse = await response.json()
    return data.items.slice(0, MAX_ITEMS_PER_SOURCE)
  } catch (error) {
    consola.error(`获取源 ${sourceId} 数据失败:`, error)
    return []
  }
}

function formatItem(item: any, index: number) {
  const title = item.title || "无标题"
  const url = item.url || "#"
  const extra = item.extra
  const info = extra?.info ? ` - ${extra.info}` : ""
  return `${index + 1}. [${title}](${url})${info}`
}

// 源ID到名称的映射
const SOURCE_NAMES: Record<string, string> = {
  weibo: "微博",
  zhihu: "知乎",
  baidu: "百度",
  bilibili: "哔哩哔哩",
  toutiao: "今日头条",
  douyin: "抖音",
  hupu: "虎扑",
  tieba: "百度贴吧",
  ithome: "IT之家",
  github: "GitHub",
  hackernews: "Hacker News",
  producthunt: "Product Hunt",
  v2ex: "V2EX",
  coolapk: "酷安",
  smzdm: "什么值得买",
  sspai: "少数派",
  juejin: "稀土掘金",
  wechat: "微信",
  zaobao: "联合早报",
  wallstreetcn: "华尔街见闻",
  cls: "财联社",
  xueqiu: "雪球",
  gelonghui: "格隆汇",
  fastbull: "法布财经",
  jin10: "金十数据",
  "36kr": "36氪",
  mktnews: "MKTNews",
  cankaoxiaoxi: "参考消息",
  sputniknewscn: "卫星通讯社",
  thepaper: "澎湃新闻",
  freebuf: "Freebuf",
  pcbeta: "远景论坛",
  linuxdo: "LinuxDo",
  nowcoder: "牛客",
  chongbuluo: "虫部落",
  douban: "豆瓣",
  steam: "Steam",
  tencent: "腾讯新闻",
  qqvideo: "腾讯视频",
  iqiyi: "爱奇艺",
  kuaishou: "快手",
  kaopu: "靠谱新闻",
  solidot: "Solidot",
  weread: "微信读书",
  acfun: "AcFun",
  hellogithub: "HelloGitHub",
  genshin: "原神",
  honkai: "崩坏",
  starrail: "星穹铁道",
}

function formatMessage(sourceItems: Record<string, any[]>) {
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
  let message = `# 📰 新闻推送\n\n**更新时间：${now}**\n\n`
  
  for (const [sourceId, items] of Object.entries(sourceItems)) {
    const sourceName = SOURCE_NAMES[sourceId] || sourceId
    
    if (items.length === 0) {
      message += `### ${sourceName}\n\n暂无数据\n\n`
      continue
    }
    
    message += `### ${sourceName}\n\n`
    items.forEach((item, index) => {
      message += `${formatItem(item, index)}\n`
    })
    message += "\n"
  }
  
  message += "---\n数据来源: NewsNow"
  return message
}

async function main() {
  consola.start("开始新闻推送任务")
  
  const sourceItems: Record<string, any[]> = {}
  for (const sourceId of SOURCE_IDS) {
    consola.info(`获取源: ${sourceId}`)
    const items = await fetchSourceData(sourceId)
    sourceItems[sourceId] = items
    consola.success(`获取到 ${items.length} 条数据`)
  }
  
  const message = formatMessage(sourceItems)
  consola.info("生成消息内容")
  consola.log(message)
  
  const success = await sendToWxPusher(message, "今日热点新闻")
  if (success) {
    consola.success("推送任务完成")
  } else {
    consola.error("推送任务失败")
    process.exit(1)
  }
}

main().catch((error) => {
  consola.error("脚本执行错误:", error)
  process.exit(1)
})