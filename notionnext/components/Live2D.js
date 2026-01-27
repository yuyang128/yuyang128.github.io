/* eslint-disable no-undef */
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { isMobile, loadExternalResource } from '@/lib/utils'
import { useEffect } from 'react'

/**
 * Live2D pet widget.
 * Supports:
 * - Cubism 2 (.model.json) via stevenjoezhang/live2d-widget loader
 * - Cubism 3 (.model3.json, moc3) via pixi-live2d-display
 */
export default function Live2D() {
  const { theme, switchTheme } = useGlobal()
  const showPet = JSON.parse(siteConfig('WIDGET_PET'))
  const petLink = siteConfig('WIDGET_PET_LINK')
  const petSwitchTheme = siteConfig('WIDGET_PET_SWITCH_THEME')

  useEffect(() => {
    if (!showPet || isMobile()) return

    const isModel3 = typeof petLink === 'string' && petLink.endsWith('.model3.json')

    const initModel3 = async () => {
      await Promise.all([
        loadExternalResource(
          'https://cdn.jsdelivr.net/npm/live2dcubismcore@1.0.2/dist/live2dcubismcore.min.js',
          'js'
        ),
        loadExternalResource(
          'https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js',
          'js'
        ),
        loadExternalResource(
          'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/pixi-live2d-display.min.js',
          'js'
        )
      ])

      const canvas = document.getElementById('live2d')
      if (!canvas || !window?.PIXI?.live2d?.Live2DModel) return

      // Clean up any previous instance (e.g. theme switch triggers re-run).
      if (canvas.__live2d_app__) {
        try {
          canvas.__live2d_app__.destroy(true, { children: true })
        } catch (_) {}
        canvas.__live2d_app__ = null
      }

      const app = new window.PIXI.Application({
        view: canvas,
        autoStart: true,
        backgroundAlpha: 0
      })

      const model = await window.PIXI.live2d.Live2DModel.from(petLink)
      app.stage.addChild(model)

      // Center the model.
      if (model.anchor?.set) {
        model.anchor.set(0.5, 0.5)
      }
      model.position.set(app.renderer.width / 2, app.renderer.height / 2)

      // Scale to fit height.
      const bounds = model.getBounds()
      if (bounds?.height) {
        const scale = (app.renderer.height * 0.9) / bounds.height
        model.scale.set(scale)
      }

      canvas.__live2d_app__ = app
    }

    const initModel2 = async () => {
      await Promise.all([
        loadExternalResource(
          'https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/live2d.min.js',
          'js'
        )
      ])

      if (typeof window?.loadlive2d !== 'undefined') {
        try {
          loadlive2d('live2d', petLink)
        } catch (error) {
          console.error('读取PET模型', error)
        }
      }
    }

    ;(async () => {
      try {
        if (isModel3) {
          await initModel3()
        } else {
          await initModel2()
        }
      } catch (err) {
        console.error('Live2D init failed:', err)
      }
    })()
  }, [theme, showPet, petLink])

  function handleClick() {
    if (petSwitchTheme) {
      switchTheme()
    }
  }

  if (!showPet) {
    return <></>
  }

  return (
    <canvas
      id='live2d'
      width='280'
      height='250'
      onClick={handleClick}
      className='cursor-grab'
      onMouseDown={e => e.target.classList.add('cursor-grabbing')}
      onMouseUp={e => e.target.classList.remove('cursor-grabbing')}
    />
  )
}

