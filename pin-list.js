/* global HTMLElement, customElements, CustomEvent, alert */
import injectCSS from './injectCSS.js'

import { IPFSPins, IPNSPins } from './ipfs.js'

export const HIDDEN = 'pin-list-hidden'

export const style = `
pin-list {
  border: 1px solid var(--pin-theme-text);
  display: block;
  padding: 0px;
  margin: 1em 0px;
}
pin-list .pin-list-spread {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 0.5em;
  row-gap: 0.5em;
  margin: 0.5em;
}
pin-list .${HIDDEN} {
  display: none;
}
pin-list .pin-list-loading {
  padding: 1em;
  text-align: center;
}
`

export class PinList extends HTMLElement {
  constructor () {
    super()
    this.isInitialized = false
  }

  initialize () {
    if (this.isInitialized) return
    this.isInitialized = true
    this.innerHTML = `
      <div class="pin-list-spread">
        <span>
          Pin List for <input class="pin-list-service-label"/>
          <select class="pin-list-protocol-select">
            <option value="ipfs">IPFS://</option>
            <option value="ipns">IPNS://</option>
          </select>
          <a class="pin-list-link" title="Link to invite for this service">🔗</a>
        </span>
        <button class="pin-list-refresh">Refresh 🗘</button>
      </div>
      <div class="pin-list-loading">
        Loading...
      </div>
      <form class="pin-list-controls pin-list-spread">
        <input class="pin-list-input" placeholder="New URL">
        <button class="pin-list-add">Add ➕</button>
      </form>
    `

    this.refreshButton.addEventListener('click', () => this.refresh())
    this.addForm.addEventListener('submit', (e) => {
      e.preventDefault()
      this.addCurrent()
    })
    this.protocolSelect.addEventListener('change', () => {
      this.protocol = this.protocolSelect.value
    })
  }

  // If you just changed the auth token, refresh manually
  // TODO: Should we refresh on new auth tokens?
  static get observedAttributes () {
    return ['protocol', 'service']
  }

  connectedCallback () {
    this.initialize()
    if (this.protocol) {
      this.refresh()
    }
  }

  attributeChangedCallback (name, oldValue, newValue) {
    this.initialize()
    this.updateLink()
    if (name === 'service') {
      this.serviceLabel.value = newValue
    }
    if (name === 'protocol') {
      this.protocolSelect.value = newValue
    }
    if (oldValue && !this.isLoading) this.refresh()
  }

  get protocol () {
    return this.getAttribute('protocol')
  }

  set protocol (newProtocol) {
    return this.setAttribute('protocol', newProtocol)
  }

  get service () {
    return this.getAttribute('service')
  }

  set service (newService) {
    return this.setAttribute('service', newService)
  }

  get auth () {
    return this.getAttribute('auth')
  }

  set auth (newAuth) {
    return this.setAttribute('auth', newAuth)
  }

  get urlInput () {
    return this.querySelector('.pin-list-input')
  }

  get addButton () {
    return this.querySelector('.pin-list-add')
  }

  get addForm () {
    return this.querySelector('.pin-list-controls')
  }

  get refreshButton () {
    return this.querySelector('.pin-list-refresh')
  }

  get serviceLabel () {
    return this.querySelector('.pin-list-service-label')
  }

  get protocolSelect () {
    return this.querySelector('.pin-list-protocol-select')
  }

  get linkAnchor () {
    return this.querySelector('.pin-list-link')
  }

  get loader () {
    return this.querySelector('.pin-list-loading')
  }

  get isLoading () {
    return !this.loader.classList.contains(HIDDEN)
  }

  async refresh () {
    this.setLoading(true)
    try {
      const list = await this.api.list()
      this.renderItems(list)
    } catch (e) {
      alert(`Unable to refresh: ${e.stack}`)
      throw e
    } finally {
      this.setLoading(false)
    }
  }

  async remove (url) {
    this.setLoading(true)
    try {
      await this.api.remove(url)
      await this.refresh()
    } catch (e) {
      alert(`Unable to remove: ${e.stack}`)
      throw e
    } finally {
      this.setLoading(false)
    }
  }

  async add (url) {
    this.setLoading(true)
    try {
      await this.api.create(url)
      await this.refresh()
    } catch (e) {
      alert(`Unable to add: ${e.stack}`)
      throw e
    } finally {
      this.setLoading(false)
    }
  }

  async addCurrent () {
    const url = this.urlInput.value
    await this.add(url)
    this.urlInput.value = ''
  }

  get api () {
    if (this.protocol === 'ipfs') {
      return new IPFSPins(this.service, this.auth)
    } else if (this.protocol === 'ipns') {
      return new IPNSPins(this.service, this.auth)
    } else {
      throw new Error(`Unknown protocol: ${this.protocol}`)
    }
  }

  clearItems () {
    for (const item of this.querySelectorAll('pin-item')) {
      this.removeChild(item)
    }
  }

  renderItems (items) {
    this.clearItems()
    this.append(...items.map(({ url }) => {
      const item = document.createElement('pin-item')
      item.url = url
      item.addEventListener('remove', () => {
        this.api.remove(url)
      })
      return item
    }))
  }

  updateLink () {
    const url = new URL(window.location.href)
    const asJSON = this.toJSON()
    const inviteData = [asJSON]
    const encoded = JSON.stringify(inviteData)
    url.searchParams.set('invite', encoded)

    this.linkAnchor.setAttribute('href', url.href)
  }

  setLoading (loading = true) {
    this.urlInput.disabled = loading
    this.addButton.disabled = loading
    this.loader.classList.toggle(HIDDEN, !loading)
  }

  toJSON () {
    const protocol = this.protocol
    const service = this.service
    const auth = this.auth

    return { protocol, service, auth }
  }
}

export class PinItem extends HTMLElement {
  constructor () {
    super()
    this.isInitialized = false
  }

  initialize () {
    if (this.isInitialized) return
    this.isInitialized = true
    this.innerHTML = `
      <a href="" class="pin-item-link"></a>
      <button class="pin-item-remove">Remove 🗑</button>
    `
    this.classList.add('pin-list-spread')

    this.removeButton.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('remove'))
    })
  }

  static get observedAttributes () {
    return ['url']
  }

  connectedCallback () {
    this.initialize()
    this.#render()
  }

  attributeChangedCallback () {
    this.initialize()
    this.#render()
  }

  get url () {
    return this.getAttribute('url')
  }

  set url (newURL) {
    this.setAttribute('url', newURL)
  }

  get removeButton () {
    return this.querySelector('button')
  }

  #render () {
    const link = this.querySelector('a')
    const url = this.url
    link.setAttribute('src', url)
    link.innerText = url
  }
}

injectCSS(style)
customElements.define('pin-item', PinItem)
customElements.define('pin-list', PinList)
