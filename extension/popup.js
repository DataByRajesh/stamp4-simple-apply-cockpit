const statusEl = document.getElementById('status')
const captureButton = document.getElementById('capture')
const optionsLink = document.getElementById('options-link')

optionsLink.addEventListener('click', (event) => {
  event.preventDefault()
  chrome.runtime.openOptionsPage()
})

captureButton.addEventListener('click', async () => {
  captureButton.disabled = true
  statusEl.textContent = 'Capturing...'

  const result = await chrome.runtime.sendMessage({ type: 'CAPTURE_ACTIVE_TAB' })

  if (result?.ok) {
    statusEl.textContent = 'Sent. Opening your Cockpit...'
    window.close()
  } else {
    statusEl.textContent = result?.error ?? 'Capture failed.'
    captureButton.disabled = false
  }
})
