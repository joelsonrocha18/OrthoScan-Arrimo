const fs = require('fs')
const path = require('path')
const pngToIco = require('png-to-ico')

const src = path.join(__dirname, '..', 'public', 'brand', 'orthoscan.png')
const out = path.join(__dirname, 'icon.ico')

async function run() {
  const input = fs.readFileSync(src)
  const output = await pngToIco([input])
  fs.writeFileSync(out, output)
  console.log(`Icon generated at ${out}`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
