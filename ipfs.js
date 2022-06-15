/* global Headers */
// IPFS Cluster IPNS API

export class IPFSPinningServiceAPI {
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
    if (response.status === 204) return []

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
export class IPFSClusterAPI {
  constructor (service, authToken = '') {
    this.service = service
    this.authToken = authToken
  }

  #prepReqestData (forURL = "") {
    let url = new URL('./pins/', this.service)
    const headers = new Headers()
    if (url.username && url.password) {
      const encoded = btoa(`${url.username}:${url.password}`)
      const auth = `Basic ${encoded}`
      headers.append('Authorization', auth)
      url.username = ''
      url.password = ''
    }

    if(forURL) {
      const path = urlToPath(forURL)
      url = new URL('.' + path, url.href)
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
    // If no pins exist yet, return an empty list
    if (response.status === 204) return []

    // The reponse will be a JSON-ND format (which isn't documented?)
    // i.e. there are JSON blobs separated by newlines
    const raw = await response.text()
    console.log('Got raw response', raw, raw.split('\n'))
    const results = raw
      .split('\n')
      .filter((chunk) => chunk.trim())
      .map((chunk) => JSON.parse(chunk))

    return results.map(({ cid, name, metadata }) => {
      // TODO: IPNS pins?
      const url = `ipfs://${cid}`
      const id = cid
      return { cid, url, name, id }
    })
  }

  async create (url, { name = url, origins, meta } = {}) {
    const { requestURL, headers } = this.#prepReqestData(url)
    const postURL = new URL(requestURL)
    if (name) postURL.searchParams.set('name', name)
    if (origins) {
      if (Array.isArrray(origins)) {
        postURL.searchParams.set('origins', origins.join(','))
      } else {
        postURL.searchParams.set('origins', origins)
      }
    }

    if (meta) {
      for (const key of Object.keys(meta)) {
        const value = meta[key]
        postURL.searchParams.set(`meta-${key}`, value)
      }
    }

    const finalURL = postURL.href

    const response = await fetch(finalURL, {
      method: 'POST',
      headers
    })
    if (!response.ok) {
      throw new Error(await response.text())
    }

    const result = await response.json()

    return result
  }

  async get (url) {
    const { requestURL, headers } = this.#prepReqestData(url)
    const response = await fetch(requestURL, {headers})

    if (!response.ok) {
      throw new Error(await response.text())
    }
    return await response.json()
  }

  async delete (url) {
    const { requestURL, headers } = this.#prepReqestData(url)
    const response = await fetch(requestURL, {
      headers,
      method: "DELETE"
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }
    return await response.json()
  }
}

function urlToPath (url) {
  return '/' + url.replace('://', '/')
}

function urlToCID (protocol, url) {
  const prefix = `${protocol}://`
  if (!url.startsWith(prefix)) {
    throw new TypeError(`Unexpected URL, must start with ${prefix}`)
  }
  const cid = url.slice(prefix.length).split('/')[0]
  return cid
}
