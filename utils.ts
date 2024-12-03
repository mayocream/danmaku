interface ChatMessage {
  id: string
  text: string
  color?: string
}

export function parseChatMessage(node: HTMLElement): ChatMessage | null {
  try {
    const id = node.id
    const text = node.querySelector('#message')?.textContent?.trim()
    const authorName = node.querySelector('#author-name')?.textContent?.trim()

    if (!text || !id) return null

    // You can customize color based on author name or other attributes
    const color = generateColorFromString(authorName || '')

    return { id, text, color }
  } catch (error) {
    console.error('Error parsing chat message:', error)
    return null
  }
}

function generateColorFromString(str: string): string {
  const colors = [
    '#FF69B4', // Hot Pink
    '#00FF00', // Lime
    '#00FFFF', // Cyan
    '#FFD700', // Gold
    '#FF4500', // Orange Red
    '#9370DB', // Medium Purple
    '#32CD32', // Lime Green
    '#FF69B4', // Hot Pink
    '#4169E1', // Royal Blue
    '#FF6347', // Tomato
  ]

  const hash = str.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)

  return colors[Math.abs(hash) % colors.length]
}
