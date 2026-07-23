const domainInput = document.getElementById('domain')
const secretInput = document.getElementById('secret')
const statusEl = document.getElementById('status')
const saveButton = document.getElementById('save')

function stripProtocolAndSlash(value) {
  return value.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

chrome.storage.local.get(['stamp4Domain', 'stamp4Secret']).then(({ stamp4Domain, stamp4Secret }) => {
  if (stamp4Domain) domainInput.value = stamp4Domain
  if (stamp4Secret) secretInput.value = stamp4Secret
})

saveButton.addEventListener('click', async () => {
  const stamp4Domain = stripProtocolAndSlash(domainInput.value)
  const stamp4Secret = secretInput.value.trim()

  if (!stamp4Domain || !stamp4Secret) {
    statusEl.style.color = '#b91c1c'
    statusEl.textContent = 'Both fields are required.'
    return
  }

  await chrome.storage.local.set({ stamp4Domain, stamp4Secret })
  statusEl.style.color = '#15803d'
  statusEl.textContent = 'Saved.'
})
