import BLOG from '@/blog.config'
import { getOrSetDataWithCache } from '@/lib/cache/cache_manager'
import { getAllCategories } from '@/lib/notion/getAllCategories'
import getAllPageIds from '@/lib/notion/getAllPageIds'
import { getAllTags } from '@/lib/notion/getAllTags'
import { getConfigMapFromConfigPage } from '@/lib/notion/getNotionConfig'
import getPageProperties, {
  adjustPageProperties
} from '@/lib/notion/getPageProperties'
import { fetchInBatches, getPage } from '@/lib/notion/getPostBlocks'
import { compressImage, mapImgUrl } from '@/lib/notion/mapImage'
import { deepClone } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import { siteConfig } from '../config'
import { extractLangId, extractLangPrefix, getShortId } from '../utils/pageId'

export { getAllTags } from '../notion/getAllTags'
export { getPost } from '../notion/getNotionPost'
export { getPage as getPostBlocks } from '../notion/getPostBlocks'

/**
 * 鑾峰彇鍗氬鏁版嵁; 鍩轰簬Notion瀹炵幇
 * @param {*} pageId
 * @param {*} from
 * @param {*} locale 璇█  zh|en|jp 绛夌瓑
 * @returns
 *
 */
export async function getGlobalData({
  pageId = BLOG.NOTION_PAGE_ID,
  from,
  locale
}) {
  // 鑾峰彇绔欑偣鏁版嵁 锛?濡傛灉pageId鏈夐€楀彿闅斿紑鍒欏垎娆″彇鏁版嵁
  const siteIds = pageId?.split(',') || []
  let data = EmptyData(pageId)

  if (BLOG.BUNDLE_ANALYZER) {
    return data
  }

  try {
    for (let index = 0; index < siteIds.length; index++) {
      const siteId = siteIds[index]
      const id = extractLangId(siteId)
      const prefix = extractLangPrefix(siteId)
      // 绗竴涓猧d绔欑偣榛樿璇█
      if (index === 0 || locale === prefix) {
        data = await getSiteDataByPageId({
          pageId: id,
          from
        })
      }
    }
  } catch (error) {
    console.error('寮傚父', error)
  }
  return handleDataBeforeReturn(deepClone(data))
}

/**
 * 鑾峰彇鎸囧畾notion鐨刢ollection鏁版嵁
 * @param pageId
 * @param from 璇锋眰鏉ユ簮
 * @returns {Promise<JSX.Element|*|*[]>}
 */
export async function getSiteDataByPageId({ pageId, from }) {
  // 鑾峰彇NOTION鍘熷鏁版嵁锛屾鎺ユ敮鎸乵em缂撳瓨銆?
  return await getOrSetDataWithCache(
    `site_data_${pageId}`,
    async (pageId, from) => {
      const pageRecordMap = await getPage(pageId, from)
      return convertNotionToSiteData(pageId, from, deepClone(pageRecordMap))
    },
    pageId,
    from
  )
}

/**
 * 鑾峰彇鍏憡
 */
async function getNotice(post) {
  if (!post) {
    return null
  }

  post.blockMap = await getPage(post.id, 'data-notice')
  return post
}

/**
 * 绌虹殑榛樿鏁版嵁
 * @param {*} pageId
 * @returns
 */
const EmptyData = pageId => {
  const empty = {
    notice: null,
    siteInfo: getSiteInfo({}),
    allPages: [
      {
        id: 1,
        title: `鏃犳硶鑾峰彇Notion鏁版嵁锛岃妫€鏌otion_ID锛?\n 褰撳墠 ${pageId}`,
        summary:
          '璁块棶鏂囨。鑾峰彇甯姪 鈫?https://docs.tangly1024.com/article/vercel-deploy-notion-next',
        status: 'Published',
        type: 'Post',
        slug: 'oops',
        publishDay: '2024-11-13',
        pageCoverThumbnail: BLOG.HOME_BANNER_IMAGE || '/bg_image.jpg',
        date: {
          start_date: '2023-04-24',
          lastEditedDay: '2023-04-24',
          tagItems: []
        }
      }
    ],
    allNavPages: [],
    collection: [],
    collectionQuery: {},
    collectionId: null,
    collectionView: {},
    viewIds: [],
    block: {},
    schema: {},
    tagOptions: [],
    categoryOptions: [],
    rawMetadata: {},
    customNav: [],
    customMenu: [],
    postCount: 1,
    pageIds: [],
    latestPosts: []
  }
  return empty
}

/**
 * 灏哊otion鏁版嵁杞珯鐐规暟鎹?
 * 杩欓噷缁熶竴瀵规暟鎹牸寮忓寲
 * @returns {Promise<JSX.Element|null|*>}
 */
async function convertNotionToSiteData(pageId, from, pageRecordMap) {
  if (!pageRecordMap) {
    console.error('can`t get Notion Data ; Which id is: ', pageId)
    return {}
  }
  pageId = idToUuid(pageId)
  let block = pageRecordMap.block || {}
  const rawMetadata = block[pageId]?.value
  // Check Type Page-Database鍜孖nline-Database
  if (
    rawMetadata?.type !== 'collection_view_page' &&
    rawMetadata?.type !== 'collection_view'
  ) {
    console.error(`pageId "${pageId}" is not a database`)
    return EmptyData(pageId)
  }
  const collection = Object.values(pageRecordMap.collection)[0]?.value || {}
  const collectionId = rawMetadata?.collection_id
  const collectionQuery = pageRecordMap.collection_query
  const collectionView = pageRecordMap.collection_view
  const schema = collection?.schema

  const viewIds = rawMetadata?.view_ids
  const collectionData = []

  const pageIds = getAllPageIds(
    collectionQuery,
    collectionId,
    collectionView,
    viewIds
  )

  if (pageIds?.length === 0) {
    console.error(
      '鑾峰彇鍒扮殑鏂囩珷鍒楄〃涓虹┖锛岃妫€鏌otion妯℃澘',
      collectionQuery,
      collection,
      collectionView,
      viewIds,
      pageRecordMap
    )
  } else {
    // console.log('鏈夋晥Page鏁伴噺', pageIds?.length)
  }

  // 鎶撳彇涓绘暟鎹簱鏈€澶氭姄鍙?000涓猙locks锛屾孩鍑虹殑鏁癰lock杩欓噷缁熶竴鎶撳彇涓€閬?
  const blockIdsNeedFetch = []
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i]
    const value = block[id]?.value
    if (!value) {
      blockIdsNeedFetch.push(id)
    }
  }
  const fetchedBlocks = await fetchInBatches(blockIdsNeedFetch)
  block = Object.assign({}, block, fetchedBlocks)

  // 鑾峰彇姣忕瘒鏂囩珷鍩虹鏁版嵁
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i]
    const value = block[id]?.value || fetchedBlocks[id]?.value
    const properties =
      (await getPageProperties(
        id,
        value,
        schema,
        null,
        getTagOptions(schema)
      )) || null

    if (properties) {
      collectionData.push(properties)
    }
  }

  // 绔欑偣閰嶇疆浼樺厛璇诲彇閰嶇疆琛ㄦ牸锛屽惁鍒欒鍙朾log.config.js 鏂囦欢
  const NOTION_CONFIG = (await getConfigMapFromConfigPage(collectionData)) || {}

  // 澶勭悊姣忎竴鏉℃暟鎹殑瀛楁
  collectionData.forEach(function (element) {
    adjustPageProperties(element, NOTION_CONFIG)
  })

  // 绔欑偣鍩虹淇℃伅
  const siteInfo = getSiteInfo({ collection, block, NOTION_CONFIG })

  // 鏂囩珷璁℃暟
  let postCount = 0

  // 鏌ユ壘鎵€鏈夌殑Post鍜孭age
  const allPages = collectionData.filter(post => {
    if (post?.type === 'Post' && post.status === 'Published') {
      postCount++
    }

    return (
      post &&
      post?.slug &&
      //   !post?.slug?.startsWith('http') &&
      (post?.status === 'Invisible' || post?.status === 'Published')
    )
  })

  // Sort by date
  if (siteConfig('POSTS_SORT_BY', null, NOTION_CONFIG) === 'date') {
    allPages.sort((a, b) => {
      return b?.publishDate - a?.publishDate
    })
  }

  const notice = await getNotice(
    collectionData.filter(post => {
      return (
        post &&
        post?.type &&
        post?.type === 'Notice' &&
        post.status === 'Published'
      )
    })?.[0]
  )
  // 鎵€鏈夊垎绫?
  const categoryOptions = getAllCategories({
    allPages,
    categoryOptions: getCategoryOptions(schema)
  })
  // 鎵€鏈夋爣绛?
  const tagSchemaOptions = getTagOptions(schema)
  const tagOptions =
    getAllTags({
      allPages: allPages ?? [],
      tagOptions: tagSchemaOptions ?? [],
      NOTION_CONFIG
    }) ?? null
  // 鏃х殑鑿滃崟
  const customNav = getCustomNav({
    allPages: collectionData.filter(
      post => post?.type === 'Page' && post.status === 'Published'
    )
  })
  // 鏂扮殑鑿滃崟
  const customMenu = getCustomMenu({ collectionData, NOTION_CONFIG })
  const latestPosts = getLatestPosts({ allPages, from, latestPostCount: 6 })
  const allNavPages = getNavPages({ allPages })

  return {
    NOTION_CONFIG,
    notice,
    siteInfo,
    allPages,
    allNavPages,
    collection,
    collectionQuery,
    collectionId,
    collectionView,
    viewIds,
    block,
    schema,
    tagOptions,
    categoryOptions,
    rawMetadata,
    customNav,
    customMenu,
    postCount,
    pageIds,
    latestPosts
  }
}

/**
 * 杩斿洖缁欐祻瑙堝櫒鍓嶇鐨勬暟鎹鐞?
 * 閫傚綋鑴辨晱
 * 鍑忓皯浣撶Н
 * 鍏跺畠澶勭悊
 * @param {*} db
 */
function handleDataBeforeReturn(db) {
  // 娓呯悊澶氫綑鏁版嵁
  delete db.block
  delete db.schema
  delete db.rawMetadata
  delete db.pageIds
  delete db.viewIds
  delete db.collection
  delete db.collectionQuery
  delete db.collectionId
  delete db.collectionView

  // 娓呯悊澶氫綑鐨勫潡
  if (db?.notice) {
    db.notice = cleanBlock(db?.notice)
    delete db.notice?.id
  }
  db.categoryOptions = cleanIds(db?.categoryOptions)
  db.customMenu = cleanIds(db?.customMenu)

  //   db.latestPosts = shortenIds(db?.latestPosts)
  db.allNavPages = shortenIds(db?.allNavPages)
  //   db.allPages = cleanBlocks(db?.allPages)

  db.allNavPages = cleanPages(db?.allNavPages, db.tagOptions)
  db.allPages = cleanPages(db.allPages, db.tagOptions)
  db.latestPosts = cleanPages(db.latestPosts, db.tagOptions)
  // 蹇呴』鍦ㄤ娇鐢ㄥ畬姣曞悗鎵嶈兘杩涜娓呯悊
  db.tagOptions = cleanTagOptions(db?.tagOptions)

  const POST_SCHEDULE_PUBLISH = siteConfig(
    'POST_SCHEDULE_PUBLISH',
    null,
    db.NOTION_CONFIG
  )
  if (POST_SCHEDULE_PUBLISH) {
    //   console.log('[瀹氭椂鍙戝竷] 寮€鍚娴?)
    db.allPages?.forEach(p => {
      // 鏂扮壒鎬э紝鍒ゆ柇鏂囩珷鐨勫彂甯冨拰涓嬫灦鏃堕棿锛屽鏋滀笉鍦ㄦ湁鏁堟湡鍐呭垯杩涜涓嬫灦澶勭悊
      const publish = isInRange(p.title, p.date)
      if (!publish) {
        const currentTimestamp = Date.now()
        const startTimestamp = getTimestamp(
          p.date.start_date,
          p.date.start_time || '00:00',
          p.date.time_zone
        )
        const endTimestamp = getTimestamp(
          p.date.end_date,
          p.date.end_time || '23:59',
          p.date.time_zone
        )
        console.log(
          '[瀹氭椂鍙戝竷] 闅愯棌--> 鏂囩珷:',
          p.title,
          '褰撳墠鏃堕棿鎴?',
          currentTimestamp,
          '鐩爣鏃堕棿鎴?',
          startTimestamp,
          '-',
          endTimestamp
        )
        console.log(
          '[瀹氭椂鍙戝竷] 闅愯棌--> 鏂囩珷:',
          p.title,
          '褰撳墠鏃堕棿:',
          new Date(),
          '鐩爣鏃堕棿:',
          p.date
        )
        // 闅愯棌
        p.status = 'Invisible'
      }
    })
  }

  return db
}

/**
 * 澶勭悊鏂囩珷鍒楄〃涓殑寮傚父鏁版嵁
 * @param {Array} allPages - 鎵€鏈夐〉闈㈡暟鎹?
 * @param {Array} tagOptions - 鏍囩閫夐」
 * @returns {Array} 澶勭悊鍚庣殑 allPages
 */
function cleanPages(allPages, tagOptions) {
  // 鏍￠獙鍙傛暟鏄惁涓烘暟缁?
  if (!Array.isArray(allPages) || !Array.isArray(tagOptions)) {
    console.warn('Invalid input: allPages and tagOptions should be arrays.')
    return allPages || [] // 杩斿洖绌烘暟缁勬垨鍘熷鍊?
  }

  // 鎻愬彇 tagOptions 涓墍鏈夊悎娉曠殑鏍囩鍚?
  const validTags = new Set(
    tagOptions
      .map(tag => (typeof tag.name === 'string' ? tag.name : null))
      .filter(Boolean) // 鍙繚鐣欏悎娉曠殑瀛楃涓?
  )

  // 閬嶅巻鎵€鏈夌殑 pages
  allPages.forEach(page => {
    // 纭繚 tagItems 鏄暟缁?
    if (Array.isArray(page.tagItems)) {
      // 瀵规瘡涓?page 鐨?tagItems 杩涜杩囨护
      page.tagItems = page.tagItems.filter(
        tagItem =>
          validTags.has(tagItem?.name) && typeof tagItem.name === 'string' // 鏍￠獙 tagItem.name 鏄惁鏄瓧绗︿覆
      )
    }
  })

  return allPages
}

/**
 * 娓呯悊涓€缁勬暟鎹殑id
 * @param {*} items
 * @returns
 */
function shortenIds(items) {
  if (items && Array.isArray(items)) {
    return deepClone(
      items.map(item => {
        item.short_id = getShortId(item.id)
        delete item.id
        return item
      })
    )
  }
  return items
}

/**
 * 娓呯悊涓€缁勬暟鎹殑id
 * @param {*} items
 * @returns
 */
function cleanIds(items) {
  if (items && Array.isArray(items)) {
    return deepClone(
      items.map(item => {
        delete item.id
        return item
      })
    )
  }
  return items
}

/**
 * 娓呯悊鍜岃繃婊agOptions
 * @param {*} tagOptions
 * @returns
 */
function cleanTagOptions(tagOptions) {
  if (tagOptions && Array.isArray(tagOptions)) {
    return deepClone(
      tagOptions
        .filter(tagOption => tagOption.source === 'Published')
        .map(({ id, source, ...newTagOption }) => newTagOption)
    )
  }
  return tagOptions
}

/**
 * 娓呯悊block鏁版嵁
 */
function cleanBlock(item) {
  const post = deepClone(item)
  const pageBlock = post?.blockMap?.block
  //   delete post?.id
  //   delete post?.blockMap?.collection

  if (pageBlock) {
    for (const i in pageBlock) {
      pageBlock[i] = cleanBlock(pageBlock[i])
      delete pageBlock[i]?.role
      delete pageBlock[i]?.value?.version
      delete pageBlock[i]?.value?.created_by_table
      delete pageBlock[i]?.value?.created_by_id
      delete pageBlock[i]?.value?.last_edited_by_table
      delete pageBlock[i]?.value?.last_edited_by_id
      delete pageBlock[i]?.value?.space_id
      delete pageBlock[i]?.value?.version
      delete pageBlock[i]?.value?.format?.copied_from_pointer
      delete pageBlock[i]?.value?.format?.block_locked_by
      delete pageBlock[i]?.value?.parent_table
      delete pageBlock[i]?.value?.copied_from_pointer
      delete pageBlock[i]?.value?.copied_from
      delete pageBlock[i]?.value?.created_by_table
      delete pageBlock[i]?.value?.created_by_id
      delete pageBlock[i]?.value?.last_edited_by_table
      delete pageBlock[i]?.value?.last_edited_by_id
      delete pageBlock[i]?.value?.permissions
      delete pageBlock[i]?.value?.alive
    }
  }
  return post
}

/**
 * 鑾峰彇鏈€鏂版枃绔?鏍规嵁鏈€鍚庝慨鏀规椂闂村€掑簭鎺掑垪
 * @param {*}} param0
 * @returns
 */
function getLatestPosts({ allPages, from, latestPostCount }) {
  const allPosts = allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )

  const latestPosts = Object.create(allPosts).sort((a, b) => {
    const dateA = new Date(a?.lastEditedDate || a?.publishDate)
    const dateB = new Date(b?.lastEditedDate || b?.publishDate)
    return dateB - dateA
  })
  return latestPosts.slice(0, latestPostCount)
}

/**
 * 鑾峰彇鐢ㄦ埛鑷畾涔夊崟椤佃彍鍗?
 * 鏃х増鏈紝涓嶈鍙朚enu鑿滃崟锛岃€屾槸璇诲彇type=Page鐢熸垚鑿滃崟
 * @param notionPageData
 * @returns {Promise<[]|*[]>}
 */
function getCustomNav({ allPages }) {
  const customNav = []
  if (allPages && allPages.length > 0) {
    allPages.forEach(p => {
      p.to = p.slug
      customNav.push({
        icon: p.icon || null,
        name: p.title || p.name || '',
        href: p.href,
        target: p.target,
        show: true
      })
    })
  }
  return customNav
}

/**
 * 鑾峰彇鑷畾涔夎彍鍗?
 * @param {*} allPages
 * @returns
 */
function getCustomMenu({ collectionData, NOTION_CONFIG }) {
  const menuPages = collectionData.filter(
    post =>
      post.status === 'Published' &&
      (post?.type === 'Menu' || post?.type === 'SubMenu')
  )
  const menus = []
  if (menuPages && menuPages.length > 0) {
    menuPages.forEach(e => {
      e.show = true
      if (e.type === 'Menu') {
        menus.push(e)
      } else if (e.type === 'SubMenu') {
        const parentMenu = menus[menus.length - 1]
        if (parentMenu) {
          if (parentMenu.subMenus) {
            parentMenu.subMenus.push(e)
          } else {
            parentMenu.subMenus = [e]
          }
        }
      }
    })
  }
  return menus
}

/**
 * 鑾峰彇鏍囩閫夐」
 * @param schema
 * @returns {undefined}
 */
function getTagOptions(schema) {
  if (!schema) return {}
  const tagSchema = Object.values(schema).find(
    e => e.name === BLOG.NOTION_PROPERTY_NAME.tags
  )
  return tagSchema?.options || []
}

/**
 * 鑾峰彇鍒嗙被閫夐」
 * @param schema
 * @returns {{}|*|*[]}
 */
function getCategoryOptions(schema) {
  if (!schema) return {}
  const categorySchema = Object.values(schema).find(
    e => e.name === BLOG.NOTION_PROPERTY_NAME.category
  )
  return categorySchema?.options || []
}

/**
 * 绔欑偣淇℃伅
 * @param notionPageData
 * @param from
 * @returns {Promise<{title,description,pageCover,icon}>}
 */
function getSiteInfo({ collection, block, NOTION_CONFIG }) {
  const defaultTitle = NOTION_CONFIG?.TITLE || 'NotionNext BLOG'
  const defaultDescription =
    NOTION_CONFIG?.DESCRIPTION || 'This site is generated by NotionNext'
  const defaultPageCover = NOTION_CONFIG?.HOME_BANNER_IMAGE || '/bg_image.jpg'
  const defaultIcon = NOTION_CONFIG?.AVATAR || '/avatar.svg'
  const defaultLink = NOTION_CONFIG?.LINK || BLOG.LINK
  // 绌烘暟鎹殑鎯呭喌杩斿洖榛樿鍊?
  if (!collection && !block) {
    return {
      title: defaultTitle,
      description: defaultDescription,
      pageCover: defaultPageCover,
      icon: defaultIcon,
      link: defaultLink
    }
  }

  const title = collection?.name?.[0][0] || defaultTitle
  const description = collection?.description
    ? Object.assign(collection).description[0][0]
    : defaultDescription

  const pageCover = collection?.cover
    ? mapImgUrl(collection?.cover, collection, 'collection')
    : defaultPageCover

  // 鐢ㄦ埛澶村儚鍘嬬缉涓€涓?
  let icon = compressImage(
    collection?.icon
      ? mapImgUrl(collection?.icon, collection, 'collection')
      : defaultIcon
  )
  // 绔欑偣缃戝潃
  const link = NOTION_CONFIG?.LINK || defaultLink

  // 绔欑偣鍥炬爣涓嶈兘鏄痚moji
  const emojiPattern = /\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g
  if (!icon || emojiPattern.test(icon)) {
    icon = defaultIcon
  }
  return { title, description, pageCover, icon, link }
}

/**
 * 鍒ゆ柇鏂囩珷鏄惁鍦ㄥ彂甯冩椂闂村唴
 * @param {string} title - 鏂囩珷鏍囬
 * @param {Object} date - 鏃堕棿鑼冨洿鍙傛暟
 * @param {string} date.start_date - 寮€濮嬫棩鏈燂紙鏍煎紡锛歒YYY-MM-DD锛?
 * @param {string} date.start_time - 寮€濮嬫椂闂达紙鍙€夛紝鏍煎紡锛欻H:mm锛?
 * @param {string} date.end_date - 缁撴潫鏃ユ湡锛堟牸寮忥細YYYY-MM-DD锛?
 * @param {string} date.end_time - 缁撴潫鏃堕棿锛堝彲閫夛紝鏍煎紡锛欻H:mm锛?
 * @param {string} date.time_zone - 鏃跺尯锛圛ANA鏍煎紡锛屽 "Asia/Shanghai"锛?
 * @returns {boolean} 鏄惁鍦ㄨ寖鍥村唴
 */
function isInRange(title, date = {}) {
  const {
    start_date,
    start_time = '00:00',
    end_date,
    end_time = '23:59',
    time_zone = 'Asia/Shanghai'
  } = date

  // 鑾峰彇褰撳墠鏃堕棿鐨勬椂闂存埑锛堝熀浜庣洰鏍囨椂鍖猴級
  const currentTimestamp = Date.now()

  // 鑾峰彇寮€濮嬪拰缁撴潫鏃堕棿鐨勬椂闂存埑
  const startTimestamp = getTimestamp(start_date, start_time, time_zone)
  const endTimestamp = getTimestamp(end_date, end_time, time_zone)

  // 鍒ゆ柇鏄惁鍦ㄨ寖鍥村唴
  if (startTimestamp && currentTimestamp < startTimestamp) {
    return false
  }

  if (endTimestamp && currentTimestamp > endTimestamp) {
    return false
  }

  return true
}

/**
 * 灏嗘寚瀹氭椂鍖虹殑鏃ユ湡瀛楃涓茶浆鎹负 UTC 鏃堕棿
 * @param {string} dateStr - 鏃ユ湡瀛楃涓诧紝鏍煎紡涓?YYYY-MM-DD HH:mm:ss
 * @param {string} timeZone - 鏃跺尯鍚嶇О锛堝 "Asia/Shanghai"锛?
 * @returns {Date} - 杞崲鍚庣殑 Date 瀵硅薄锛圲TC 鏃堕棿锛?
 */
function convertToUTC(dateStr, timeZone = 'Asia/Shanghai') {
  // 缁存姢涓€涓椂鍖哄亸绉绘槧灏勶紙浠ュ皬鏃朵负鍗曚綅锛?
  const timeZoneOffsets = {
    // UTC 鍩虹
    UTC: 0,
    'Etc/GMT': 0,
    'Etc/GMT+0': 0,

    // 浜氭床鍦板尯
    'Asia/Shanghai': 8, // 涓浗
    'Asia/Taipei': 8, // 鍙版咕
    'Asia/Tokyo': 9, // 鏃ユ湰
    'Asia/Seoul': 9, // 闊╁浗
    'Asia/Kolkata': 5.5, // 鍗板害
    'Asia/Jakarta': 7, // 鍗板凹
    'Asia/Singapore': 8, // 鏂板姞鍧?
    'Asia/Hong_Kong': 8, // 棣欐腐
    'Asia/Bangkok': 7, // 娉板浗
    'Asia/Dubai': 4, // 闃胯仈閰?
    'Asia/Tehran': 3.5, // 浼婃湕
    'Asia/Riyadh': 3, // 娌欑壒闃挎媺浼?

    // 娆ф床鍦板尯
    'Europe/London': 0, // 鑻卞浗锛圙MT锛?
    'Europe/Paris': 1, // 娉曞浗锛圕ET锛?
    'Europe/Berlin': 1, // 寰峰浗
    'Europe/Moscow': 3, // 淇勭綏鏂?
    'Europe/Amsterdam': 1, // 鑽峰叞

    // 缇庢床鍦板尯
    'America/New_York': -5, // 缇庡浗涓滈儴锛圗ST锛?
    'America/Chicago': -6, // 缇庡浗涓儴锛圕ST锛?
    'America/Denver': -7, // 缇庡浗灞卞尯鏃堕棿锛圡ST锛?
    'America/Los_Angeles': -8, // 缇庡浗瑗块儴锛圥ST锛?
    'America/Sao_Paulo': -3, // 宸磋タ
    'America/Argentina/Buenos_Aires': -3, // 闃挎牴寤?

    // 闈炴床鍦板尯
    'Africa/Johannesburg': 2, // 鍗楅潪
    'Africa/Cairo': 2, // 鍩冨強
    'Africa/Nairobi': 3, // 鑲凹浜?

    // 澶ф磱娲插湴鍖?
    'Australia/Sydney': 10, // 婢冲ぇ鍒╀簹涓滈儴
    'Australia/Perth': 8, // 婢冲ぇ鍒╀簹瑗块儴
    'Pacific/Auckland': 13, // 鏂拌タ鍏?
    'Pacific/Fiji': 12, // 鏂愭祹

    // 鍖楁瀬涓庡崡鏋?
    'Antarctica/Palmer': -3, // 鍗楁瀬娲插笗灏旈粯
    'Antarctica/McMurdo': 13 // 鍗楁瀬娲查害鍏嬮粯澶?
  }

  // 棰勮姣忎釜澶ф床鐨勯粯璁ゆ椂鍖?
  const continentDefaults = {
    Asia: 'Asia/Shanghai',
    Europe: 'Europe/London',
    America: 'America/New_York',
    Africa: 'Africa/Cairo',
    Australia: 'Australia/Sydney',
    Pacific: 'Pacific/Auckland',
    Antarctica: 'Antarctica/Palmer',
    UTC: 'UTC'
  }

  // 鑾峰彇鐩爣鏃跺尯鐨勫亸绉婚噺锛堜互灏忔椂涓哄崟浣嶏級
  let offsetHours = timeZoneOffsets[timeZone]

  // 鏈鏀寔鐨勬椂鍖洪噰鐢ㄥ吋瀹?
  if (offsetHours === undefined) {
    // 鑾峰彇鏃跺尯鎵€灞炲ぇ娲诧紙"Continent/City" -> "Continent"锛?
    const continent = timeZone.split('/')[0]

    // 閫夋嫨璇ュぇ娲茬殑榛樿鏃跺尯
    const fallbackZone = continentDefaults[continent] || 'UTC'
    offsetHours = timeZoneOffsets[fallbackZone]

    console.warn(
      `Warning: Unsupported time zone "${timeZone}". Using default "${fallbackZone}" for continent "${continent}".`
    )
  }

  // 灏嗘棩鏈熷瓧绗︿覆杞崲涓烘湰鍦版椂闂寸殑 Date 瀵硅薄
  const localDate = new Date(`${dateStr.replace(' ', 'T')}Z`)
  if (isNaN(localDate.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`)
  }

  // 璁＄畻 UTC 鏃堕棿鐨勬椂闂存埑
  const utcTimestamp = localDate.getTime() - offsetHours * 60 * 60 * 1000
  return new Date(utcTimestamp)
}

// 杈呭姪鍑芥暟锛氱敓鎴愭寚瀹氭棩鏈熸椂闂寸殑鏃堕棿鎴筹紙鍩轰簬鐩爣鏃跺尯锛?
function getTimestamp(date, time = '00:00', time_zone) {
  if (!date) return null
  return convertToUTC(`${date} ${time}:00`, time_zone).getTime()
}

/**
 * 鑾峰彇瀵艰埅鐢ㄧ殑绮惧噺鏂囩珷鍒楄〃
 * gitbook涓婚鐢ㄥ埌锛屽彧淇濈暀鏂囩珷鐨勬爣棰樺垎绫绘爣绛惧垎绫讳俊鎭紝绮惧噺鎺夋憳瑕佸瘑鐮佹棩鏈熺瓑鏁版嵁
 * 瀵艰埅椤甸潰鐨勬潯浠讹紝蹇呴』鏄疨osts
 * @param {*} param0
 */
export function getNavPages({ allPages }) {
  const allNavPages = allPages?.filter(post => {
    return (
      post &&
      post?.slug &&
      post?.type === 'Post' &&
      post?.status === 'Published'
    )
  })

  return allNavPages.map(item => ({
    id: item.id,
    title: item.title || '',
    pageCoverThumbnail: item.pageCoverThumbnail || '',
    category: item.category || null,
    tags: item.tags || null,
    summary: item.summary || null,
    slug: item.slug,
    href: item.href,
    pageIcon: item.pageIcon || '',
    lastEditedDate: item.lastEditedDate,
    publishDate: item.publishDate,
    ext: item.ext || {}
  }))
}
