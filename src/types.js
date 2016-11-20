export function types () {
    return 1
}

export function tests (test) {
    test("this test is defined in types.js", (t) => {
        t.equal(types(), 1, "this works")
        t.end()
    })
}
