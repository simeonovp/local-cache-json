# local-cache-json
Library for managing local cache with json data

## Parameter description
config params:
- path: local folder for the sorage
- url: URL of global cache, e.g. shared by multiple projects
- backPath: (optional) folder used for backups

manifest: a special DB contains meta data, e.g. for tracking local changes and sychronisation infos

## Usage example
```javascript
const { DbBase } = require('local-cache-json')
const path = require('path')

const resDir = path.join(__dirname, 'resources)
const db = new DbBase({ path: path.join(resDir, 'data.json') })

db.load()
const data = db.data || {}
data['newParam'] = 'parValus'
db.save(true, true)
```

TODO: Extend API description

## Thanks
If you like our ideas and want to support further development, you can donate here:  
[![Donate](https://img.shields.io/badge/donate-PayPal-blue.svg)](https://paypal.me/tasmotas)
[![Donate](https://img.shields.io/badge/donate-buy%20me%20a%20coffee-yellow.svg)](https://www.buymeacoffee.com/smarthomenodes)
