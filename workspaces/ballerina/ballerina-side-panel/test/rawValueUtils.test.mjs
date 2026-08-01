import test from "node:test";
import assert from "node:assert/strict";

import { stringToRawArrayElements, buildStringArray } from "../lib/components/editors/rawValueUtils.js";

test("stringToRawArrayElements splits on the separators of the array", () => {
    assert.deepEqual(stringToRawArrayElements("[a, b, c]"), ["a", " b", " c"]);
    assert.deepEqual(stringToRawArrayElements('["a", [1, 2], {k: 1}]').length, 3);
});

test("stringToRawArrayElements returns no element for an empty array", () => {
    assert.deepEqual(stringToRawArrayElements("[]"), []);
});

test("stringToRawArrayElements preserves a trailing empty element", () => {
    assert.deepEqual(stringToRawArrayElements("[a, ]"), ["a", " "]);
});

test("stringToRawArrayElements keeps a comma of a quoted string within its element", () => {
    assert.deepEqual(stringToRawArrayElements('["a, b"]'), ['"a, b"']);
});

test("stringToRawArrayElements keeps a comma of a call within its element", () => {
    assert.deepEqual(stringToRawArrayElements("[foo(a, b)]"), ["foo(a, b)"]);
});

test("stringToRawArrayElements keeps a comma of a template within its element", () => {
    const element = "string `Customer details: ID ${customerIdElement.data()}, Name ${firstNameElement.data()}`";
    assert.deepEqual(stringToRawArrayElements(`[${element}]`), [element]);
});

test("stringToRawArrayElements keeps a comma of an interpolation within its element", () => {
    const element = "string `a ${f(1, 2)} b`";
    assert.deepEqual(stringToRawArrayElements(`[${element}]`), [element]);
});

test("stringToRawArrayElements ends a template that holds a backtick within an interpolation", () => {
    // string `Backtick:${"`"}` holds a literal backtick, which does not end the template
    const element = 'string `Backtick:${"`"}`';
    assert.deepEqual(stringToRawArrayElements(`[${element}, next]`), [element, " next"]);
});

test("stringToRawArrayElements splits after a template", () => {
    assert.deepEqual(stringToRawArrayElements('[string `p, q`, "r"]'), ["string `p, q`", ' "r"']);
});

test("an element of an array survives a round trip through buildStringArray", () => {
    const element = "string `Customer details: ID ${a.data()}, Name ${b.data()}`";
    assert.deepEqual(stringToRawArrayElements(buildStringArray([{ value: element }])), [element]);
});
