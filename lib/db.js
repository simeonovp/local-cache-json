const path = require('path')
const fs = require('fs')
const request = require('request')

class DbBase {
  /*
  config = {
    path: '',
    url: '',
    backPath: '',
  }
  manifest = {
    data
  }
  */
  constructor(config, manifest, logger) {
    this.config = config || {}
    this.data = {}
    this.manifest = manifest

    this.log = logger?.log.bind(logger) || console.info
    this.warn = logger?.warn.bind(logger) || console.warn
    this.error = logger?.error.bind(logger) || console.error
    this.log(`db create(config:${JSON.stringify(config)}`)

    this.downloadPending = false
    this.load()
  }

  static JSONparse(json) {
    try {
      return JSON.parse(json)
    }
    catch(err) {
      console.error(`Error JSON.parse(${json}):${err}`)
    }
  }
  
  static JSONsaveAsync(obj, filePath) {
    const json = JSON.stringify(obj, null, 2)
    fs.createWriteStream(filePath).write(json)
    return json
  }

  static JSONsave(obj, filePath) {
    const json = JSON.stringify(obj, null, 2)
    fs.writeFileSync(filePath, json)
    return json
  }

  static JSONload(filePath) {
    const json = fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8')
    return json && DbBase.JSONparse(json)
  }
  
  static sortByKey(obj, locale, recursive) {
    const sorted = {};
    const keys = locale ? Object.keys(obj).sort((a, b) => a.localeCompare(b, locale))
      : Object.keys(obj).sort()
    for (const key of keys) {
      sorted[key] = recursive && (typeof obj[key] === 'object') ? DbBase.sortByKey(obj[key], locale, recursive) : obj[key]
    }
    return sorted
  }
  
  updateManifest(key, json) {
    if (!this.manifest) return
    this.manifest.data = this.manifest.data || {}
    const fileManifest = this.manifest.data[key] || {}
    if (fileManifest.length && json.length && (fileManifest.length === json.length) && (fileManifest.hash === this.hashCode(json))) return
    fileManifest.length = json.length
    fileManifest.hash = this.hashCode(json)
    fileManifest.date = new Date()
    this.manifest.data[key] = fileManifest
    this.manifest.save(true)
  }

  get empty() { return !this.data || !Object.keys(this.data).length }

  clear() {
    this.data = {}
  }

  load() {
    if (!this.config.path || !fs.existsSync(this.config.path)) return
    const json = fs.readFileSync(this.config.path, 'utf8') || {}
    this.data = DbBase.JSONparse(json) || {}

    const fileManifest = this.manifest?.data?.[this.config.path] || {}
    if (fileManifest.length && json.length && (fileManifest.length === json.length) && (fileManifest.hash === this.hashCode(json))) return
    this.save(true, true)
  }

  save(overwrite, sort, recursive) {
    if (!this.config.path) return
    if (sort) this.data = DbBase.sortByKey(this.data, (typeof sort === 'string') ? sort : '', recursive)
    this.log(`db save(overwrite:${overwrite}, sort:${sort}) to:${this.config.path}`)
    const exists = fs.existsSync(this.config.path)
    if (!overwrite && exists) return
    if (exists && this.config.backPath) {
      const formatDate = (date) => {
        const year = date.getFullYear().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const hour = date.getHours().toString().padStart(2, '0')
        const minute = date.getMinutes().toString().padStart(2, '0')
        const second = date.getSeconds().toString().padStart(2, '0')
        return year + month + day + hour + minute + second
      }
      const parsedPath = path.parse(filePath)
      const bakPath = path.join(this.config.backPath, `${parsedPath.base}_${formatDate(new Date())}${parsedPath.ext}`)
      fs.renameSync(parsedPath, bakPath)
    }
    const json = DbBase.JSONsave(this.data, this.config.path)
    this.updateManifest(this.config.path, json)
  }

  download(skipIfSame = false) {
    const url = this.config.url
    if (!url) return
    if (this.downloadPending) return
    this.downloadPending = true
    return new Promise((resolve, reject) => {
      request(url, { json: true }, (err, resp, data) => {
        if (err || (resp && resp.statusCode >= 400) || !data) {
          this.warn('Failed to get ' + url)
          reject (err ? err : resp.statusCode)
          this.downloadPending = false
          return
        }
        
        const json = JSON.stringify(data, null, 2)
        const manifest = this.manifest?.data
        const length = manifest && manifest[url]?.length || 0
        const hash = manifest && manifest[url]?.hash || 0
        if (skipIfSame && length && json.length && (length === json.length) && (hash === this.hashCode(json))) {
          resolve()
          this.downloadPending = false
          return
        }

        this.data = data || {}
        this.updateManifest(url, json)
        resolve(json)
        this.downloadPending = false
      })
    })
  }
  
  hashCode(string) {
    let hash = 0
    for (let i = 0; i < string.length; i++) {
      let code = string.charCodeAt(i)
      hash = ((hash << 5) - hash) + code
      hash = hash & hash // Convert to 32bit integer
    }
    return hash
  }


  getTable(table) {
    return this.data && this.data[table]
  }

  findTableRaw(table, col, val, ignorecase = false) {
    const arr = this.getTable(table)
    if (ignorecase) {
      val = val.toUpperCase()
      return arr && arr.find(row => (row[col].toUpperCase() === val))
    }
    return arr && arr.find(row => (row[col] === val))
  }

  getTableRawIndex(table, col, val) {
    const arr = this.getTable(table)
    return arr && arr.findIndex(row => (row[col] === val))
  }

}

module.exports = DbBase