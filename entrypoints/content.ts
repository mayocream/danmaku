type Message = {
  text: string
  color: string
  x: number
  y: number
  width: number
}

type State = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  messages: Message[]
  frameId: number
}

const config = {
  lanes: 12, // Number of vertical lanes
  speed: 150, // Pixels per second
  fontSize: 24,
  minSpacing: 50, // Minimum horizontal spacing between messages
}

// Create and setup canvas
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
  return { canvas, ctx, messages: [], frameId: 0 }
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

// Simple collision check for a single lane
const hasCollisionInLane = (
  state: State,
  x: number,
  width: number,
  lane: number
): boolean => {
  const y = (lane + 0.5) * (state.canvas.height / config.lanes)

  return state.messages.some((msg) => {
    if (Math.abs(msg.y - y) > config.fontSize) return false
    const spacing = config.minSpacing
    return !(x - spacing > msg.x + msg.width || x + width + spacing < msg.x)
  })
}

// Find available lane and position for new message
const findSafePosition = (
  state: State,
  width: number
): { x: number; y: number } | null => {
  const lanes = Array.from({ length: config.lanes }, (_, i) => i)
  const x = state.canvas.width

  // Try each lane in random order
  for (const lane of lanes.sort(() => Math.random() - 0.5)) {
    const y = (lane + 0.5) * (state.canvas.height / config.lanes)
    if (!hasCollisionInLane(state, x, width, lane)) {
      return { x, y }
    }
  }
  return null
}

const createMessage = (
  state: State,
  text: string,
  color: string
): Message | null => {
  const width = state.ctx.measureText(text).width
  const position = findSafePosition(state, width)

  if (!position) return null

  return { text, color, width, ...position }
}

// Main render loop
const render = (state: State) => {
  // Clear canvas
  const { ctx, canvas } = state
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Update and draw messages
  state.messages = state.messages.filter((msg) => {
    msg.x -= config.speed / 60 // Assume 60fps for simplicity
    if (msg.x + msg.width < 0) return false

    ctx.fillStyle = msg.color
    ctx.fillText(msg.text, msg.x, msg.y)
    return true
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
      const message = createMessage(state, text, color)
      if (message) state.messages.push(message)
    }
  }

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) =>
      mutation.addedNodes.forEach((node) => {
        if (
          node instanceof HTMLElement &&
          node.matches('yt-live-chat-text-message-renderer')
        ) {
          processMessage(node)
        }
      })
    )
  }).observe(
    (
      document.querySelector('iframe#chatframe') as HTMLIFrameElement
    )?.contentDocument?.querySelector('#items') ??
      document.createElement('div'),
    { childList: true, subtree: true }
  )
}

// Initialize
const init = () => {
  const state = initState()

  const initPlayer = setInterval(() => {
    const player = document.querySelector('.html5-video-container')
    if (!player) return

    clearInterval(initPlayer)
    player.appendChild(state.canvas)

    resizeCanvas(state)
    new ResizeObserver(() => resizeCanvas(state)).observe(
      document.querySelector('.html5-video-container video')!
    )

    render(state)
    observeChat(state)
  }, 1000)

  return () => {
    cancelAnimationFrame(state.frameId)
    state.canvas.remove()
  }
}

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
