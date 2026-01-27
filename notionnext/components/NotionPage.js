import { siteConfig } from '@/lib/config'
import { compressImage, mapImgUrl } from '@/lib/notion/mapImage'
import { isBrowser, loadExternalResource } from '@/lib/utils'
import mediumZoom from '@fisch0920/medium-zoom'
import 'katex/dist/katex.min.css'
import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'
import { NotionRenderer } from 'react-notion-x'

/**
 * 鏁翠釜绔欑偣鐨勬牳蹇冪粍浠?
 * 灏哊otion鏁版嵁娓叉煋鎴愮綉椤?
 * @param {*} param0
 * @returns
 */
const NotionPage = ({ post, className }) => {
  // 鏄惁鍏抽棴鏁版嵁搴撳拰鐢诲唽鐨勭偣鍑昏烦杞?
  const POST_DISABLE_GALLERY_CLICK = siteConfig('POST_DISABLE_GALLERY_CLICK')
  const POST_DISABLE_DATABASE_CLICK = siteConfig('POST_DISABLE_DATABASE_CLICK')
  const SPOILER_TEXT_TAG = siteConfig('SPOILER_TEXT_TAG')

  const zoom =
    isBrowser &&
    mediumZoom({
      //   container: '.notion-viewport',
      background: 'rgba(0, 0, 0, 0.2)',
      margin: getMediumZoomMargin()
    })

  const zoomRef = useRef(zoom ? zoom.clone() : null)
  const IMAGE_ZOOM_IN_WIDTH = siteConfig('IMAGE_ZOOM_IN_WIDTH', 1200)
  // 椤甸潰棣栨鎵撳紑鏃舵墽琛岀殑鍕惧瓙
  useEffect(() => {
    // 妫€娴嬪綋鍓嶇殑url骞惰嚜鍔ㄦ粴鍔ㄥ埌瀵瑰簲鐩爣
    autoScrollToHash()
  }, [])

  // 椤甸潰鏂囩珷鍙戠敓鍙樺寲鏃朵細鎵ц鐨勫嬀瀛?
  useEffect(() => {
    // 鐩稿唽瑙嗗浘鐐瑰嚮绂佹璺宠浆锛屽彧鑳芥斁澶ф煡鐪嬪浘鐗?
    if (POST_DISABLE_GALLERY_CLICK) {
      // 閽堝椤甸潰涓殑gallery瑙嗗浘锛岀偣鍑诲悗鏄斁澶у浘鐗囪繕鏄烦杞埌gallery鐨勫唴閮ㄩ〉闈?
      processGalleryImg(zoomRef?.current)
    }

    // 椤靛唴鏁版嵁搴撶偣鍑荤姝㈣烦杞紝鍙兘鏌ョ湅
    if (POST_DISABLE_DATABASE_CLICK) {
      processDisableDatabaseUrl()
    }

    /**
     * 鏀惧ぇ鏌ョ湅鍥剧墖鏃舵浛鎹㈡垚楂樻竻鍥惧儚
     */
    const observer = new MutationObserver((mutationsList, observer) => {
      mutationsList.forEach(mutation => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          if (mutation.target.classList.contains('medium-zoom-image--opened')) {
            // 绛夊緟鍔ㄧ敾瀹屾垚鍚庢浛鎹负鏇撮珮娓呯殑鍥惧儚
            setTimeout(() => {
              // 鑾峰彇璇ュ厓绱犵殑 src 灞炴€?
              const src = mutation?.target?.getAttribute('src')
              //   鏇挎崲涓烘洿楂樻竻鐨勫浘鍍?
              mutation?.target?.setAttribute(
                'src',
                compressImage(src, IMAGE_ZOOM_IN_WIDTH)
              )
            }, 800)
          }
        }
      })
    })

    // 鐩戣椤甸潰鍏冪礌鍜屽睘鎬у彉鍖?
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class']
    })

    return () => {
      observer.disconnect()
    }
  }, [post])

  useEffect(() => {
    // Spoiler鏂囨湰鍔熻兘
    if (SPOILER_TEXT_TAG) {
      import('lodash/escapeRegExp').then(escapeRegExp => {
        Promise.all([
          loadExternalResource('/js/spoilerText.js', 'js'),
          loadExternalResource('/css/spoiler-text.css', 'css')
        ]).then(() => {
          window.textToSpoiler &&
            window.textToSpoiler(escapeRegExp.default(SPOILER_TEXT_TAG))
        })
      })
    }

    // 鏌ユ壘鎵€鏈夊叿鏈?'notion-collection-page-properties' 绫荤殑鍏冪礌,鍒犻櫎notion鑷甫鐨勯〉闈roperties
    const timer = setTimeout(() => {
      // 鏌ユ壘鎵€鏈夊叿鏈?'notion-collection-page-properties' 绫荤殑鍏冪礌
      const elements = document.querySelectorAll(
        '.notion-collection-page-properties'
      )

      // 閬嶅巻杩欎簺鍏冪礌骞跺皢鍏朵粠 DOM 涓Щ闄?
      elements?.forEach(element => {
        element?.remove()
      })
    }, 1000) // 1000 姣 = 1 绉?

    // 娓呯悊瀹氭椂鍣紝闃叉缁勪欢鍗歌浇鏃舵墽琛?
    return () => clearTimeout(timer)
  }, [post])

  if (!post?.blockMap) {
    return (
      <div id='notion-article' className={mx-auto overflow-hidden }>
        <div style={{ padding: '16px', border: '1px solid #eee', borderRadius: '8px' }}>
          <strong>Notion content not loaded.</strong>
          <div style={{ marginTop: '8px' }}>
            Please check that your Notion database is published to web and NOTION_PAGE_ID is correct.
          </div>
        </div>
      </div>
    )
  }

  return (
      className={`mx-auto overflow-hidden ${className || ''}`}>
      <NotionRenderer
        recordMap={post?.blockMap}
        mapPageUrl={mapPageUrl}
        mapImageUrl={mapImgUrl}
        components={{
          Code,
          Collection,
          Equation,
          Modal,
          Pdf,
          Tweet
        }}
      />

      <AdEmbed />
      <PrismMac />
    </div>
  )
}

/**
 * 椤甸潰鐨勬暟鎹簱閾炬帴绂佹璺宠浆锛屽彧鑳芥煡鐪?
 */
const processDisableDatabaseUrl = () => {
  if (isBrowser) {
    const links = document.querySelectorAll('.notion-table a')
    for (const e of links) {
      e.removeAttribute('href')
    }
  }
}

/**
 * gallery瑙嗗浘锛岀偣鍑诲悗鏄斁澶у浘鐗囪繕鏄烦杞埌gallery鐨勫唴閮ㄩ〉闈?
 */
const processGalleryImg = zoom => {
  setTimeout(() => {
    if (isBrowser) {
      const imgList = document?.querySelectorAll(
        '.notion-collection-card-cover img'
      )
      if (imgList && zoom) {
        for (let i = 0; i < imgList.length; i++) {
          zoom.attach(imgList[i])
        }
      }

      const cards = document.getElementsByClassName('notion-collection-card')
      for (const e of cards) {
        e.removeAttribute('href')
      }
    }
  }, 800)
}

/**
 * 鏍规嵁url鍙傛暟鑷姩婊氬姩鍒伴敋浣嶇疆
 */
const autoScrollToHash = () => {
  setTimeout(() => {
    // 璺宠浆鍒版寚瀹氭爣棰?
    const hash = window?.location?.hash
    const needToJumpToTitle = hash && hash.length > 0
    if (needToJumpToTitle) {
      console.log('jump to hash', hash)
      const tocNode = document.getElementById(hash.substring(1))
      if (tocNode && tocNode?.className?.indexOf('notion') > -1) {
        tocNode.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
    }
  }, 180)
}

/**
 * 灏唅d鏄犲皠鎴愬崥鏂囧唴閮ㄩ摼鎺ャ€?
 * @param {*} id
 * @returns
 */
const mapPageUrl = id => {
  // return 'https://www.notion.so/' + id.replace(/-/g, '')
  return '/' + id.replace(/-/g, '')
}

/**
 * 缂╂斁
 * @returns
 */
function getMediumZoomMargin() {
  const width = window.innerWidth

  if (width < 500) {
    return 8
  } else if (width < 800) {
    return 20
  } else if (width < 1280) {
    return 30
  } else if (width < 1600) {
    return 40
  } else if (width < 1920) {
    return 48
  } else {
    return 72
  }
}

// 浠ｇ爜
const Code = dynamic(
  () =>
    import('react-notion-x/build/third-party/code').then(m => {
      return m.Code
    }),
  { ssr: false }
)

// 鍏紡
const Equation = dynamic(
  () =>
    import('@/components/Equation').then(async m => {
      // 鍖栧鏂圭▼寮?
      await import('@/lib/plugins/mhchem')
      return m.Equation
    }),
  { ssr: false }
)

// 鍘熺増鏂囨。
// const Pdf = dynamic(
//   () => import('react-notion-x/build/third-party/pdf').then(m => m.Pdf),
//   {
//     ssr: false
//   }
// )
const Pdf = dynamic(() => import('@/components/Pdf').then(m => m.Pdf), {
  ssr: false
})

// 缇庡寲浠ｇ爜 from: https://github.com/txs
const PrismMac = dynamic(() => import('@/components/PrismMac'), {
  ssr: false
})

/**
 * tweet宓屽叆
 */
const TweetEmbed = dynamic(() => import('react-tweet-embed'), {
  ssr: false
})

/**
 * 鏂囧唴google骞垮憡
 */
const AdEmbed = dynamic(
  () => import('@/components/GoogleAdsense').then(m => m.AdEmbed),
  { ssr: true }
)

const Collection = dynamic(
  () =>
    import('react-notion-x/build/third-party/collection').then(
      m => m.Collection
    ),
  {
    ssr: true
  }
)

const Modal = dynamic(
  () => import('react-notion-x/build/third-party/modal').then(m => m.Modal),
  { ssr: false }
)

const Tweet = ({ id }) => {
  return <TweetEmbed tweetId={id} />
}

export default NotionPage

