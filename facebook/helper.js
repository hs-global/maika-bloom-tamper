/*---HELPER---*/
async function wait(ms) { return new Promise(res => setTimeout(res, ms)); };
async function digest(message) {
	const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
	const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8); // hash the message
	const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
	const hashHex = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join(""); // convert bytes to hex string
	return hashHex;
};
async function waitForElement(selector) {
	return new Promise((resolve) => {
		if (document.querySelector(selector)) {
			return resolve(document.querySelector(selector));
		}

		const observer = new MutationObserver(() => {
			if (document.querySelector(selector)) {
				observer.disconnect();
				resolve(document.querySelector(selector));
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
	});
};
async function scrollToEnd(query='body', idx=0, count=3) {
	let element = [...document.querySelectorAll(query)][idx];

	if (element) {
		element.focus();
		element.scrollIntoView();
		mouseEventOf('mousemove', element, 1, 1);
		mouseEventOf('mouseover', element, 1, 1);
	}

	for (var i = 0; i < count; i++) {
		// console.log('scrollToEnd')
		ENV.UI.status.textContent = `scrollToEnd: ${i+1}/${count}`;
		window.scrollTo(0, document.body.scrollHeight);
		await wait(1e3);
	}
};
async function llmgen({token, cid, data}) {
	ENV.UI.status.textContent = `llmgen: ${token}`;
	let json = await fetchJSON(ENV.host.llm_gen, {
		method: 'POST',
		headers: {
			'x-api-key': ENV.x_api_key,
		},
		body: JSON.stringify({
			'token': token,
			'cid': cid,
			'renderData': data
		})
	});

	return json;
};
async function aquery(aql, first) {
	console.log('aquery', aql, first);

	let json = await fetchJSON(ENV.host.aquery, {
		method: 'POST',
		body: JSON.stringify({aql})
	});

	return first ? json?.[0] : json;
};
async function prepareCid(){
	let json = await fetchJSON(ENV.host.token_handler, {
		method: 'POST',
		headers: {
			'x-api-key': ENV.x_api_key,
		},
		body: JSON.stringify({
			"cid": CUSTOMER.cid,
			"func": "getValue",
			"args": [
				"int.settings#",
				{
					"$input": {
					}
				}
			]
		})
	});

	CUSTOMER.settings = json?.data;
	console.log('cid:', json);

	// log(CUSTOMER?.settings?.story)
};
function makeDraggable(element, dragHandle) {
	let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

	if (dragHandle) {
		dragHandle.onmousedown = dragMouseDown;
	} else {
		element.onmousedown = dragMouseDown;
	}

	function dragMouseDown(e) {
		e = e || window.event;
		e.preventDefault();
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.onmouseup = closeDragElement;
		document.onmousemove = elementDrag;
	}

	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;
		element.style.top = (element.offsetTop - pos2) + "px";
		element.style.left = (element.offsetLeft - pos1) + "px";
	}

	function closeDragElement() {
		document.onmouseup = null;
		document.onmousemove = null;
	}
}
function text2Clipboard(text, title='Fuck browser! Press Ctrl+C to copy long content') {
	log(title);

	if (ENV?.UI?.draft) {
		ENV.UI.draft.value = text;
		ENV.UI.draft.setSelectionRange?.(0, 9e9);
	}

	try {
		navigator.clipboard.writeText(text);
	} catch (ex) {console.warn(ex.message)};

	try {
		document.execCommand('copy');
	} catch (ex) {console.warn(ex.message)};

	// try {
	// 	setTimeout(() => {
	// 		window.prompt(title, text);
	// 	}, 1e3);
	// } catch (ex) {console.warn(ex.message)};
}
function flashTitle(interval, variables=[], resolve) {
	const TITLE = document.title;

	const MAX = 100;;
	let count;
	const handler = setInterval(() => {
		count++;

		if (count > MAX) return clearInterval(handler);

		if (Math.random() > 0.5)
			document.title = variables[Math.floor(Math.random() * variables.length)] + ' ' + TITLE;
		else
			document.title = TITLE;
	}, interval);

	const done = (result) => {
		document.title = TITLE;
		clearInterval(handler);
		resolve?.(result);
	}

	return done;
}
function mouseEventOf(eventType, element, x=0, y=0) {
	const rect = element.getBoundingClientRect()

	try {
		const event = new MouseEvent(eventType, {
			bubbles: true,
			cancelable: true,
			clientX: rect.left + x,
			clientY: rect.top + y,
		})
		element.dispatchEvent(event)
	} catch (e) {console.error(e)}
}
function parentOf(element, lv=1, query, index) {
	if (!element) return;

	let pointer = element;

	for (var i = 0; i < lv; i++) pointer = pointer?.parentNode || pointer;

	if (query) pointer = pointer.querySelectorAll?.(query);

	if (index >= 0) pointer = pointer?.[index];

	return pointer;
}
function cleanLink(link='') {
	return link.replace(/__[a-z]+__(\[0\])?=[^\=\&\;\']*/g, '');
}
function clickfocusDOM(element) {
	if (!element) return;

	element.hover?.();
	element.focus?.();
	element.click?.();
	element.style['background-color'] = ENV.focuscolor;
}
function mapReaction(src) {
	if (src.includes("stop-color='#FF74AE'")) return 'like';
	else if (src.includes("0866FF")) return 'like';
	else if (src.includes("stop-color='#2B7EFF'")) return 'heart';
	else if (src.includes("stop-color='#FFF287'")) return 'sad';
	else if (src.includes("stop-color='#FF60A4'")) return 'laugh';

	return 'reacted'
}
function fetchJSON(url, options) {
	console.log('fetchJSON', url)
	return new Promise(resolve => {
		console.time('fetchJSON')
		GM_xmlhttpRequest({
			method: options?.method || 'GET',
			url: url,
			headers: {...(options?.headers || {}), 'Content-Type': 'application/json'},
			data: options?.body,
			onload: (res) => {
				// console.timeEnd('fetchJSON')
				try {
					resolve(JSON.parse(res.responseText));
				} catch (e) {
					console.log('fetchJSON.catch', e);
					resolve();
				}
			},
			onerror: (e) => {
				// console.timeEnd('fetchJSON')
				console.log('fetchJSON.error', e)
				resolve()
			},
		});
	});
}
function log(text, title='', flush) {
	if (typeof text !=='string' && !text) return;

	console.log(title, text);

	try {
		if (flush) ENV.UI.draft.value = '';

		ENV.UI.textarea.value = [
			flush ? '' : ENV.UI.textarea.value,
			typeof text == 'object' ? YAML.stringify(text) : text,
		].filter(x => x).join('\n---\n');
		ENV.UI.textarea.scrollTop = ENV.UI.textarea.scrollHeight;

		if (title) {
			ENV.UI.status.textContent = title;
		}
	} catch (ex) {}
}