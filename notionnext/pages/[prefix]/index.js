import BLOG from '@/blog.config'
import useNotification from '@/components/Notification'
import OpenWrite from '@/components/OpenWrite'
import { siteConfig } from '@/lib/config'
import { getGlobalData, getPost } from '@/lib/db/getSiteData'
import { useGlobal } from '@/lib/global'
import { getPageTableOfContents } from '@/lib/notion/getPageTableOfContents'
import { getPasswordQuery } from '@/lib/password'
import { checkSlugHasNoSlash, processPostData } from '@/lib/utils/post'
import { DynamicLayout } from '@/themes/theme'
import md5 from 'js-md5'
import { useRouter } from 'next/router'
import { idToUuid } from 'notion-utils'
import { useEffect, useState } from 'react'

/**
 * 鏍规嵁notion鐨剆lug璁块棶椤甸潰
 * 鍙В鏋愪竴绾х洰褰曚緥濡?/about
 * @param {*} props
 * @returns
 */
const Slug = props => {
  const { post } = props
  const router = useRouter()
  const { locale } = useGlobal()

  // 鏂囩珷閿侌煍?
  const [lock, setLock] = useState(post?.password && post?.password !== '')
  const { showNotification, Notification } = useNotification()

  /**
   * 楠岃瘉鏂囩珷瀵嗙爜
   * @param {*} passInput
   */
  const validPassword = passInput => {
    if (!post) {
      return false
    }
    const encrypt = md5(post?.slug + passInput)
    if (passInput && encrypt === post?.password) {
      setLock(false)
      // 杈撳叆瀵嗙爜瀛樺叆localStorage锛屼笅娆¤嚜鍔ㄦ彁浜?
      localStorage.setItem('password_' + router.asPath, passInput)
      showNotification(locale.COMMON.ARTICLE_UNLOCK_TIPS) // 璁剧疆瑙ｉ攣鎴愬姛鎻愮ず鏄剧ず
      return true
    }
    return false
  }

  // 鏂囩珷鍔犺浇
  useEffect(() => {
    // 鏂囩珷鍔犲瘑
    if (post?.password && post?.password !== '') {
      setLock(true)
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
      paths: [],
      fallback: true
    }
  }

  const from = 'slug-paths'
  const { allPages } = await getGlobalData({ from })
  const paths = allPages
    ?.filter(row => checkSlugHasNoSlash(row))
    .map(row => ({ params: { prefix: row.slug } }))
  return {
    paths: paths,
    fallback: true
  }
}

export async function getStaticProps({ params: { prefix }, locale }) {
  let fullSlug = prefix
  const from = `slug-props-${fullSlug}`
  const props = await getGlobalData({ from, locale })
  if (siteConfig('PSEUDO_STATIC', false, props.NOTION_CONFIG)) {
    if (!fullSlug.endsWith('.html')) {
      fullSlug += '.html'
    }
  }

  // 鍦ㄥ垪琛ㄥ唴鏌ユ壘鏂囩珷
  props.post = props?.allPages?.find(p => {
    return (
      p.type.indexOf('Menu') < 0 &&
      (p.slug === prefix || p.id === idToUuid(prefix))
    )
  })

  // 澶勭悊闈炲垪琛ㄥ唴鏂囩珷鐨勫唴淇℃伅
  if (!props?.post) {
    const pageId = prefix
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
      // If Notion data contains blocks that cannot be fetched/rendered during static export,
    // don't fail the whole build; render an empty page instead.
    try {
      await processPostData(props, from)
    } catch (err) {
      console.error('[processPostData failed]', from, err)
      props.post = null
    }
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

export default Slug

