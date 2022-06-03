/* global HTMLElement, customElements, localStorage */
const PINNING_SERVICES = 'pinning_services'

export class PinManager extends HTMLElement {
  constructor () {
    super()

    this.isInitialized = false
  }

  initialize () {
    if (this.isInitialized) return
    this.isInitialized = true

    this.innerHTML = `
      <button class="pin-manager-add-button">Add Service➕</button>
    `
    this.addButton.addEventListener('click', () => {
      this.append(document.createElement('pin-list'))
    })
    window.addEventListener('beforeunload', () => this.save(this.existing))
  }

  connectedCallback () {
    this.initialize()
    this.load()
  }

  get addButton () {
    return this.querySelector('.pin-manager-add-button')
  }

  load () {
    const saved = this.saved
    const fromInvite = this.fromInvite

    const all = [...saved, ...fromInvite]

    const hasSeen = new Set()

    this.append(...all.map(({ service, protocol, auth }) => {
      const seenKey = service + auth
      if (hasSeen.has(seenKey)) return ''
      hasSeen.add(seenKey)
      const list = document.createElement('pin-list')
      list.service = service
      list.protocol = protocol
      list.auth = auth
      return list
    }))
  }

  save (list) {
    localStorage.setItem(PINNING_SERVICES, JSON.stringify(list))
  }

  get lists () {
    return this.querySelectorAll('pin-list')
  }

  get saved () {
    const raw = localStorage.getItem(PINNING_SERVICES)
    if (raw) {
      try {
        return JSON.parse(raw)
      } catch (e) {
        console.log('Error parsing saved services', e)
        return []
      }
    } else {
      return []
    }
  }

  get fromInvite () {
    const { searchParams } = new URL(window.location.href)
    if (searchParams.has('invite')) {
      try {
        const parsed = JSON.parse(searchParams.get('invite'))
        if (!Array.isArray(parsed)) return []
        return parsed
      } catch {
        return []
      }
    } else return []
  }

  get existing () {
    const services = []
    for (const list of this.lists) {
      services.push(list.toJSON())
    }
    return services
  }
}

customElements.define('pin-manager', PinManager)
