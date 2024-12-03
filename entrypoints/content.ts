import { parseChatMessage } from '../utils'

class DanmakuOverlay {
  private container: HTMLDivElement
  private messages: Map<string, HTMLDivElement>
  private lanes: boolean[]
  private readonly laneCount = 20
  private readonly messageLifetime = 8000 // 8 seconds

  constructor() {
    this.container = document.createElement('div')
    this.container.className = 'danmaku-container'
    this.messages = new Map()
    this.lanes = new Array(this.laneCount).fill(false)
    this.initialize()
  }

  private initialize() {
    console.log('Danmaku overlay initialized')
    // Wait for YouTube player to be ready
    const waitForPlayer = setInterval(() => {
      const player = document.querySelector('.html5-video-player')
      if (player) {
        clearInterval(waitForPlayer)
        player.appendChild(this.container)
        this.observeChatMessages()
      }
    }, 1000)
  }

  private observeChatMessages() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (
            node instanceof HTMLElement &&
            node.matches('yt-live-chat-text-message-renderer')
          ) {
            const message = parseChatMessage(node)
            if (message) {
              this.addDanmaku(message)
            }
          }
        })
      })
    })

    // Observe the live chat iframe
    const observeLiveChat = setInterval(() => {
      const chatFrame = document.querySelector('iframe#chatframe')
      if (chatFrame) {
        clearInterval(observeLiveChat)
        const chatContent = (chatFrame as HTMLIFrameElement).contentDocument?.querySelector('#items')
        if (chatContent) {
          observer.observe(chatContent, { childList: true, subtree: true })
        }
      }
    }, 1000)
  }

  private findAvailableLane(): number {
    const lane = this.lanes.findIndex((occupied) => !occupied)
    return lane !== -1 ? lane : Math.floor(Math.random() * this.laneCount)
  }

  private addDanmaku(message: { id: string; text: string; color?: string }) {
    const lane = this.findAvailableLane()
    this.lanes[lane] = true

    const danmaku = document.createElement('div')
    danmaku.className = 'danmaku-message'
    danmaku.textContent = message.text
    danmaku.style.top = `${(lane / this.laneCount) * 100}%`
    if (message.color) {
      danmaku.style.color = message.color
    }

    this.container.appendChild(danmaku)
    this.messages.set(message.id, danmaku)

    // Animate the message
    requestAnimationFrame(() => {
      danmaku.style.transform = 'translateX(-100%)'
      danmaku.style.transition = `transform ${this.messageLifetime}ms linear`
    })

    // Clean up after animation
    setTimeout(() => {
      this.messages.delete(message.id)
      danmaku.remove()
      this.lanes[lane] = false
    }, this.messageLifetime)
  }
}

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  main() {
    // Initialize when page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => new DanmakuOverlay())
    } else {
      new DanmakuOverlay()
    }
  },
})
