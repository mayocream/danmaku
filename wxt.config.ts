import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Danmaku',
  },
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
})
