type Message = {
  text: string
  color: string
  x: number
  y: number
  width: number
  lane: number
}

type State = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  messages: Message[]
  frameId: number
  lastTime: number
}

// Simple configuration
const config = {
  lanes: 20,
  speed: 150,
  fontSize: 24,
  pollInterval: 1000,
} as const

// Core rendering functions
const createCanvas = () => {
  const canvas = document.createElement('canvas')
  Object.assign(canvas.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    pointerEvents: 'none',
  })
  return canvas
}

const initState = (): State => {
  const canvas = createCanvas()
  const ctx = canvas.getContext('2d')!
  return {
    canvas,
    ctx,
    messages: [],
    frameId: 0,
    lastTime: performance.now(),
  }
}

const resizeCanvas = (state: State) => {
  const video = document.querySelector<HTMLVideoElement>(
    '.html5-video-container video'
  )
  if (!video) return

  const { width, height } = video.getBoundingClientRect()
  state.canvas.width = width
  state.canvas.height = height
  state.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  state.ctx.font = `${config.fontSize}px Arial`
}

// Message handling
const createMessage = (state: State, text: string, color: string): Message => {
  const width = state.ctx.measureText(text).width
  const laneHeight = state.canvas.height / config.lanes
  const lane = Math.floor(Math.random() * config.lanes)

  return {
    text,
    color,
    x: state.canvas.width,
    y: (lane + 0.5) * laneHeight,
    width,
    lane,
  }
}

// Main render loop
const render = (state: State) => {
  const now = performance.now()
  const delta = (now - state.lastTime) / 1000
  state.lastTime = now

  // Update positions and remove off-screen messages
  state.messages = state.messages.filter((msg) => {
    msg.x -= config.speed * delta
    return msg.x + msg.width > 0
  })

  // Draw frame
  const { ctx, canvas } = state
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.textBaseline = 'middle'

  state.messages.forEach((msg) => {
    ctx.fillStyle = msg.color
    ctx.fillText(msg.text, msg.x, msg.y)
  })

  state.frameId = requestAnimationFrame(() => render(state))
}

// Chat observer
const observeChat = (state: State) => {
  const processMessage = (node: Element) => {
    const text = node.querySelector('#message')?.textContent
    const author = node.querySelector('#author-name')

    if (text && author) {
      const color = getComputedStyle(author).color
      state.messages.push(createMessage(state, text, color))
    }
  }

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (
          node instanceof HTMLElement &&
          node.matches('yt-live-chat-text-message-renderer')
        ) {
          processMessage(node)
        }
      })
    })
  }).observe(
    (
      document.querySelector('iframe#chatframe') as HTMLIFrameElement
    )?.contentDocument?.querySelector('#items') ??
      document.createElement('div'),
    { childList: true, subtree: true }
  )
}

// Main initialization
const init = () => {
  const state = initState()

  const initPlayer = setInterval(() => {
    const player = document.querySelector('.html5-video-container')
    if (!player) return

    clearInterval(initPlayer)
    player.appendChild(state.canvas)

    // Setup
    resizeCanvas(state)
    new ResizeObserver(() => resizeCanvas(state)).observe(
      document.querySelector('.html5-video-container video')!
    )

    render(state)
    observeChat(state)
  }, config.pollInterval)

  // Cleanup function
  return () => {
    cancelAnimationFrame(state.frameId)
    state.canvas.remove()
  }
}

// Entry point
export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  main() {
    return document.readyState === 'loading'
      ? new Promise((resolve) =>
          document.addEventListener('DOMContentLoaded', () => resolve(init()))
        )
      : init()
  },
})
