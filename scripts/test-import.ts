import { consola } from "consola"
import { getters } from "../server/getters"
import sources from "../shared/sources"

consola.info("导入成功")
consola.info(`获取器数量: ${Object.keys(getters).length}`)
consola.info(`源数量: ${Object.keys(sources).length}`)

// 测试一个源
const testSource = "zhihu" as const
if (getters[testSource]) {
  consola.info(`测试源 ${testSource} 存在`)
} else {
  consola.error(`测试源 ${testSource} 不存在`)
}