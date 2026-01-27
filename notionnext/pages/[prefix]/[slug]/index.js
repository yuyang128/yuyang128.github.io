import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData, getPost } from '@/lib/db/getSiteData'
import { checkSlugHasOneSlash, processPostData } from '@/lib/utils/post'
import { idToUuid } from 'notion-utils'
import Slug from '..'

/**
 * 鏍规嵁notion鐨剆lug璁块棶椤甸潰
 * 瑙ｆ瀽浜岀骇鐩綍 /article/about
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

export async function getStaticPaths() {
  if (!BLOG.isProd) {
    return {
      paths: [],
      fallback: true
    }
  }

  const from = 'slug-paths'
  const { allPages } = await getGlobalData({ from })

  // 鏍规嵁slug涓殑 / 鍒嗗壊鎴恜refix鍜宻lug涓や釜瀛楁 ; 渚嬪 article/test
  // 鏈€缁堢敤鎴峰彲浠ラ€氳繃  [domain]/[prefix]/[slug] 璺緞璁块棶锛屽嵆杩欓噷鐨?[domain]/article/test
  const paths = allPages
    ?.filter(row => checkSlugHasOneSlash(row))
    .map(row => ({
      params: { prefix: row.slug.split('/')[0], slug: row.slug.split('/')[1] }
    }))

  // 澧炲姞涓€绉嶈闂矾寰?鍏佽閫氳繃 [category]/[slug] 璁块棶鏂囩珷
  // 渚嬪鏂囩珷slug 鏄?test 锛岀劧鍚庢枃绔犵殑鍒嗙被category鏄?production
  // 鍒欓櫎浜?[domain]/[slug] 浠ュ锛岃繕鏀寔鍒嗙被鍚嶈闂? [domain]/[category]/[slug]

  return {
    paths: paths,
    fallback: true
  }
}

export async function getStaticProps({ params: { prefix, slug }, locale }) {
  const fullSlug = prefix + '/' + slug
  const from = `slug-props-${fullSlug}`
  const props = await getGlobalData({ from, locale })

  // 鍦ㄥ垪琛ㄥ唴鏌ユ壘鏂囩珷
  props.post = props?.allPages?.find(p => {
    return (
      p.type.indexOf('Menu') < 0 &&
      (p.slug === slug || p.slug === fullSlug || p.id === idToUuid(fullSlug))
    )
  })

  // 澶勭悊闈炲垪琛ㄥ唴鏂囩珷鐨勫唴淇℃伅
  if (!props?.post) {
    const pageId = slug.slice(-1)[0]
    if (pageId.length >= 32) {
      const post = await getPost(pageId)
      props.post = post
    }
  }

  if (!props?.post) {
    // 鏃犳硶鑾峰彇鏂囩珷
    props.post = null
  } else {
    
// If Notion data contains blocks that cannot be fetched/rendered during static export,
    
// don't fail the whole build; render an empty page instead.
    
try {
    
  await processPostData(props, from)
    
} catch (err) {
    
  console.error('[processPostData failed]', from, err)
    
  props.post = null
    
}

}

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export default PrefixSlug

