import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import { idToUuid } from 'notion-utils'
import { useEffect } from 'react'

/**
 * 404
 * @param {*} props
 * @returns
 */
const NoFound = props => {
  // GitHub Pages uses static export, so middleware-based UUID redirects don't run.
  // Do a best-effort client-side redirect from Notion UUID/ID -> slug if redirect.json exists.
  useEffect(() => {
    try {
      const path = window.location.pathname || ''
      const last = path.split('/').filter(Boolean).pop() || ''
      if (!last) return

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        last
      )
      const isNotionId = /^[0-9a-f]{32}$/i.test(last)
      if (!isUuid && !isNotionId) return

      const key = isNotionId ? idToUuid(last) : last

      fetch('/redirect.json')
        .then(r => (r.ok ? r.json() : null))
        .then(map => {
          if (!map || !map[key]) return
          const target = map[key].startsWith('/') ? map[key] : '/' + map[key]
          if (target !== path) {
            window.location.replace(target)
          }
        })
        .catch(() => {})
    } catch (_) {}
  }, [])

  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='Layout404' {...props} />
}

export async function getStaticProps(req) {
  const { locale } = req

  const props = (await getGlobalData({ from: '404', locale })) || {}
  return { props }
}

export default NoFound
