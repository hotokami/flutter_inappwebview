import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const java = readFileSync(new URL('../../flutter_inappwebview_android/android/src/main/java/com/pichillilorenzo/flutter_inappwebview_android/webview/JavaScriptBridgeInterface.java', import.meta.url), 'utf8');
assert.match(java, /_callHandlerID == null \|\| !_callHandlerID\.matches\("\[0-9\]\+"\)/);
assert.match(java, /final String quotedCallHandlerID = JSONObject\.quote\(_callHandlerID\)/);
assert.doesNotMatch(java, /\+ _callHandlerID \+/);
const sources = [...java.matchAll(/String sourceCode = ([\s\S]*?);\n/g)].map(match => match[1]);
assert.equal(sources.length, 2, 'cover success and error completions');
for (const [index, expression] of sources.entries()) {
  for (const id of ['123', '(window.marker=731)', '\"];window.marker=731;//']) {
    const messages = [];
    const bridge = {[id]: {resolve: value => messages.push(value), reject: error => messages.push(error.message)}};
    const context = vm.createContext({
      window: {flutter_inappwebview: bridge, marker: null},
      JavaScriptBridgeJS: {JAVASCRIPT_BRIDGE_NAME: 'flutter_inappwebview'},
      JSONObject: {quote: JSON.stringify},
      quotedCallHandlerID: JSON.stringify(id), json: '{"ok":true}', message: 'native error',
    });
    const source = vm.runInContext(expression, context);
    vm.runInContext(source, context);
    assert.equal(context.window.marker, null);
    assert.equal(messages.length, 1);
    if (index === 0) assert.equal(messages[0].ok, true);
    else assert.equal(messages[0], 'native error');
    assert.equal(bridge[id], undefined);
  }
}
console.log('Android callback completion: success/error numeric compatibility and injected IDs remain data');
