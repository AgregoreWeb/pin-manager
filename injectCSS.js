export default function injectCSS (css) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}
