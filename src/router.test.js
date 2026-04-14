import { expect, test, describe, beforeEach, vi } from 'vitest'
import { initRouter } from './router.js'

// Stub all view modules — we only care about router behavior, not view rendering
vi.mock('./views/ClubManager.js', () => ({ mount: vi.fn(), unmount: vi.fn() }))
vi.mock('./views/MemberEditor.js', () => ({ mount: vi.fn(), unmount: vi.fn() }))
vi.mock('./views/SessionSetup.js', () => ({ mount: vi.fn(), unmount: vi.fn() }))
vi.mock('./views/RoundDisplay.js', () => ({ mount: vi.fn(), unmount: vi.fn() }))
vi.mock('./views/Settings.js', () => ({ mount: vi.fn(), unmount: vi.fn() }))
vi.mock('./views/Help.js', () => ({ mount: vi.fn(), unmount: vi.fn() }))
vi.mock('./views/MatchEditor.js', () => ({ mount: vi.fn(), unmount: vi.fn() }))

describe('router', () => {
  let el

  beforeEach(() => {
    el = document.createElement('div')
    window.location.hash = ''
    window.scrollTo = vi.fn()
  })

  test('scrolls to top on every route change', async () => {
    initRouter(el)
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)

    window.scrollTo.mockClear()
    window.location.hash = '#/active'
    window.dispatchEvent(new Event('hashchange'))
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })
})
