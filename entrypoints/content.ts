export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  main() {
    console.log('Hello content.');
  },
});
