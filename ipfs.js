/* global Headers */
// IPFS Cluster IPNS API
export class IPFSPins {
  constructor (service, authToken = '') {
    this.service = service
    this.authToken = authToken
  }

  #prepReqestData () {
    const url = new URL('./pins', this.service)
    const headers = new Headers()
    if (url.username && url.password) {
      const encoded = btoa(`${url.username}:${url.password}`)
      const auth = `Basic ${encoded}`
      headers.append('Authorization', auth)
      url.username = ''
      url.password = ''
    }

    const requestURL = url.href

    return { headers, requestURL }
  }

  async list () {
    const { requestURL, headers } = this.#prepReqestData()
    const response = await fetch(requestURL, {
      headers
    })
    if (!response.ok) {
      throw new Error(await response.text())
    }
    const { results } = await response.json()
    if (!results) return []

    return results.map(({ pin, requestid: id }) => {
      const { cid, name } = pin
      const url = `ipfs://${cid}`
      return { cid, url, name, id }
    })
  }

  async create (url, { name = url, origins, meta } = {}) {
    const cid = urlToCID(url)
    const params = {
      cid, name, origins, meta
    }

    console.log('Pinning', params)

    const { requestURL, headers } = this.#prepReqestData()
    headers.append('Content-Type', 'application/json')
    const response = await fetch(requestURL, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    })
    if (!response.ok) {
      throw new Error(await response.text())
    }

    const result = await response.json()

    return result
  }

  async get (url) {
    const getCID = urlToCID(url)
    const list = await this.list(url)

    return list.filter(({ cid }) => cid === getCID)
  }

  async delete (url) {
    const { id } = await this.get(url)

    const { requestURL, headers } = this.#prepReqestData()
    const finalURL = new URL(`./${id}`, requestURL).href
    const response = await fetch(finalURL, {
      method: 'DELETE',
      headers
    })
    if (!response.ok) {
      throw new Error(await response.text())
    }

    return response.text()
  }
}

// IPFS Cluster IPNS API
export class IPNSPins {
  constructor (service, authToken = '') {
    this.service = service
    this.authToken = authToken
  }

  async list () {

  }

  async create (url, opts) {

  }

  async get (url) {

  }

  async delete (url) {

  }
}

function urlToCID (protocol, url) {
  const prefix = `${protocol}://`
  if (!url.startsWith(prefix)) {
    throw new TypeError(`Unexpected URL, must start with ${prefix}`)
  }
  const cid = url.slice(prefix.length).split('/')[0]
  return cid
}
