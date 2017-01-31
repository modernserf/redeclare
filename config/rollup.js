const rollup = require("rollup")
const buble = require("rollup-plugin-buble")

build("src/index.js", "lib/index.js")

function build (entry, dest) {
    rollup.rollup({
        entry: entry,
        plugins: [ buble({ transforms: { computedProperty: true } }) ],
    }).then((bundle) => bundle.write({
        dest: dest,
        format: "cjs",
    })).catch((e) => {
        console.error(e)
    })
}
