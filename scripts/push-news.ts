import { consola } from "consola"
import type { SourceID, SourceResponse } from "../shared/types"
import process from "process"

// 从环境变量获取配置
const WXPUSHER_APP_TOKEN = process.env.WXPUSHER_APP_TOKEN
const WXPUSHER_USER_ID = process.env.WXPUSHER_USER_ID
const BASE_URL = process.env.BASE_URL || "https://newsnow.busiyi.world"

// WxPusher 配置（保持原样）
const WXPUSHER_SOURCE_IDS = (process.env.WXPUSHER_SOURCE_IDS || process.env.SOURCE_IDS || "weibo,zhihu,baidu,bilibili,toutiao").split(",") as SourceID[]
const WXPUSHER_MAX_ITEMS = parseInt(process.env.WXPUSHER_MAX_ITEMS || process.env.MAX_ITEMS_PER_SOURCE || "8", 10)

// Telegram 配置（增加新闻源和数量）
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const TELEGRAM_USERNAME = process.env.TELEGRAM_USERNAME || '@wwyyybbbb'
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID || '7789762624'
const TELEGRAM_FIRST_NAME = process.env.TELEGRAM_FIRST_NAME || 'deed'
const TELEGRAM_LAST_NAME = process.env.TELEGRAM_LAST_NAME || 'Iioooii'
const TELEGRAM_LANGUAGE = process.env.TELEGRAM_LANGUAGE || 'zh-hans'
const TELEGRAM_SOURCE_IDS = (process.env.TELEGRAM_SOURCE_IDS || "weibo,zhihu,baidu,bilibili,toutiao,douyin,hupu,tieba,ithome,github").split(",") as SourceID[]
const TELEGRAM_MAX_ITEMS = parseInt(process.env.TELEGRAM_MAX_ITEMS || "12", 10)

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
      consola.success("WxPusher消息推送成功")
      return true
    } else {
      consola.error(`WxPusher推送失败: ${result.msg}`)
      return false
    }
  } catch (error) {
    consola.error("WxPusher推送请求失败:", error)
    return false
  }
}

async function sendToTelegram(content: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    consola.warn("Telegram配置不完整，跳过Telegram推送")
    return true
  }
  
  try {
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    
    // Telegram消息有长度限制，需要分割
    const maxLength = 4096
    const messages = []
    
    if (content.length <= maxLength) {
      messages.push(content)
    } else {
      // 简单分割，保持段落完整性
      let currentMessage = ""
      const lines = content.split("\n")
      
      for (const line of lines) {
        if ((currentMessage + line + "\n").length > maxLength) {
          messages.push(currentMessage.trim())
          currentMessage = line + "\n"
        } else {
          currentMessage += line + "\n"
        }
      }
      
      if (currentMessage.trim()) {
        messages.push(currentMessage.trim())
      }
    }
    
    let allSuccess = true
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      const isLast = i === messages.length - 1
      
      const response = await fetch(TELEGRAM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: !isLast // 只在最后一条消息显示预览
        })
      })
      
      const result = await response.json()
      
      if (result.ok) {
        consola.success(`Telegram消息 ${i + 1}/${messages.length} 发送成功`)
      } else {
        consola.error(`Telegram消息 ${i + 1}/${messages.length} 发送失败:`, result.description)
        allSuccess = false
      }
      
      // 避免发送过快
      if (!isLast) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return allSuccess
  } catch (error) {
    consola.error("Telegram推送请求失败:", error)
    return false
  }
}

async function fetchSourceData(sourceId: SourceID, maxItems: number): Promise<any[]> {
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
    return data.items.slice(0, maxItems)
  } catch (error) {
    consola.error(`获取源 ${sourceId} 数据失败:`, error)
    return []
  }
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

function formatMessage(sourceItems: Record<string, any[]>, format: 'markdown' | 'html' = 'markdown') {
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
  let message = format === 'html' ? `📰<b>${now}</b>\n\n` : `📰${now}\n\n`
  
  for (const [sourceId, items] of Object.entries(sourceItems)) {
    const sourceName = SOURCE_NAMES[sourceId] || sourceId
    
    if (items.length === 0) continue
    
    if (format === 'html') {
      message += `【<b>${sourceName}</b>】\n`
    } else {
      message += `【${sourceName}】\n`
    }
    
    items.forEach((item, index) => {
      const title = item.title || "无标题"
      const extra = item.extra
      const info = extra?.info ? ` ${extra.info}` : ""
      
      if (format === 'html') {
        // Telegram消息：只显示标题，不包含链接（避免过长）
        message += `${index + 1}. ${title}${info}\n`
      } else {
        // WxPusher消息：保持原样（可以包含链接）
        message += `${index + 1}.${title}${info}\n`
      }
    })
    message += "\n"
  }
  
  message += "NewsNow"
  return message
}

async function main() {
  consola.start("开始新闻推送任务")
  
  // 输出用户信息
  consola.info(`Telegram用户: ${TELEGRAM_FIRST_NAME} ${TELEGRAM_LAST_NAME} (@${TELEGRAM_USERNAME.replace('@', '')})`)
  consola.info(`用户ID: ${TELEGRAM_USER_ID}, 语言: ${TELEGRAM_LANGUAGE}`)
  
  // 分别获取WxPusher和Telegram的数据
  const wxSourceItems: Record<string, any[]> = {}
  const tgSourceItems: Record<string, any[]> = {}
  
  // 获取WxPusher数据（5个源，每个8条）
  consola.info("\n=== 获取WxPusher数据 ===")
  for (const sourceId of WXPUSHER_SOURCE_IDS) {
    consola.info(`获取源: ${sourceId}`)
    const items = await fetchSourceData(sourceId, WXPUSHER_MAX_ITEMS)
    wxSourceItems[sourceId] = items
    consola.success(`获取到 ${items.length} 条数据`)
  }
  
  // 获取Telegram数据（10个源，每个12条）
  consola.info("\n=== 获取Telegram数据 ===")
  for (const sourceId of TELEGRAM_SOURCE_IDS) {
    consola.info(`获取源: ${sourceId}`)
    const items = await fetchSourceData(sourceId, TELEGRAM_MAX_ITEMS)
    tgSourceItems[sourceId] = items
    consola.success(`获取到 ${items.length} 条数据`)
  }
  
  // 生成消息
  consola.info("\n=== 生成消息 ===")
  const wxMessage = formatMessage(wxSourceItems, 'markdown')
  const tgMessage = formatMessage(tgSourceItems, 'html')
  
  consola.info(`WxPusher消息: ${wxMessage.length} 字符`)
  consola.info(`Telegram消息: ${tgMessage.length} 字符`)
  
  // 发送到WxPusher
  consola.info("\n=== 发送消息 ===")
  const wxSuccess = await sendToWxPusher(wxMessage, "今日热点新闻")
  
  // 发送到Telegram
  const tgSuccess = await sendToTelegram(tgMessage)
  
  if (wxSuccess && tgSuccess) {
    consola.success("\n✅ 推送任务完成")
    consola.info(`WxPusher: ${WXPUSHER_SOURCE_IDS.length}个源 × ${WXPUSHER_MAX_ITEMS}条 = ${WXPUSHER_SOURCE_IDS.length * WXPUSHER_MAX_ITEMS}条新闻`)
    consola.info(`Telegram: ${TELEGRAM_SOURCE_IDS.length}个源 × ${TELEGRAM_MAX_ITEMS}条 = ${TELEGRAM_SOURCE_IDS.length * TELEGRAM_MAX_ITEMS}条新闻`)
  } else {
    if (!wxSuccess) consola.error("WxPusher推送失败")
    if (!tgSuccess) consola.error("Telegram推送失败")
    process.exit(1)
  }
}

main().catch((error) => {
  consola.error("脚本执行错误:", error)
  process.exit(1)
})