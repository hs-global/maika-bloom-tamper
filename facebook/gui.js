function prepareSelect(select) {
	select.reinit = (options=[]) => {
		[...(select.options || [])].map(x => x?.remove?.());

		options.forEach(x => {
			x = x.trim();
			let opt = document.createElement("option");
			opt.value = x;
			opt.text = x;
			select.add(opt, null);
		});
	};
}

function init(titleText = [CUSTOMER.cid, CUSTOMER.profile_name].join(' - '), placeholderText = 'Message', statusText = 'status') {
	const floater = document.createElement('div');

	floater.id = 'maika-floater';
	floater.style.position = 'fixed';
	floater.style.bottom = '10px';
	floater.style.left = '10px';
	floater.style.width = '345px';
	floater.style.height = 'min-content;'
	floater.style['max-height'] = '450px';
	floater.style.backgroundColor = '#f9f9f9';
	floater.style.zIndex = '10000';
	floater.style.fontFamily = 'monospace';
	floater.style.padding = '1px';
	// floater.style.opacity = '0.7';
	floater.style.color = '#eee';
	floater.style['background-color'] = '#111';

	var css = [
		'#maika-floater{ opacity: 0.7 }',
		'#maika-floater:hover{ opacity: 1.0 }',
	].join('\n');
	var style = document.createElement('style');

	if (style.styleSheet) {
		style.styleSheet.cssText = css;
	} else {
		style.appendChild(document.createTextNode(css));
	}
	document.getElementsByTagName('head')[0].appendChild(style);

	// floater.addEventListener("mouseover", () => {
	// 	floater.style.opacity = '1';
	// });

	// floater.addEventListener("mouseout", () => {
	// 	floater.style.opacity = '0.7';
	// });

	const title = document.createElement('h3');
	title.id = 'maika-title';
	title.textContent = titleText;
	title.style.margin = '0 0 2px 0';
	title.style.color = '#673ab7';
	title.style.fontSize = '1.2em';
	title.style['word-break'] = 'break-all';
	title.style.cursor = 'move';
	title.style.padding = '0px 2px';
	title.style.display = 'inline-block';

	const mini = document.createElement('h3');
	mini.id = 'maika-mini';
	mini.textContent = '▼';
	mini.style.margin = '0 0 2px 0';
	mini.style.color = 'yellow';
	mini.style.fontSize = '1.5em';
	mini.style.cursor = 'pointer';
	mini.style.padding = '0px 2px';
	mini.style.display = 'inline-block';

	const status = document.createElement('p');
	status.id = 'maika-status';
	status.textContent = statusText;
	status.style.margin = '5px';
	status.style.color = 'smoke';
	status.style.fontSize = '1em';
	status.style['word-break'] = 'break-all';

	const checkbox = document.createElement('div');
	checkbox.reinit = (options=[]) => {
		return checkbox.innerHTML = [
			`<form>`,
			`<div id="maika-checkboxes">`,
				options.map((x, i) => `<label for="maika-check-${i}" style="display:block"><input type="checkbox" id="maika-check-${i}" value="${x}" />${x}</label>`)
						.join('\n'),
			`</div>`,
			`</form>`,
		].join('\n').trim();
	};

	const select = document.createElement('select');
	select.style.display = 'none';
	prepareSelect(select);
	select.addEventListener("change", function() {
		log('select.value: ' + select.value)
	});

	status.id = 'maika-status';
	status.textContent = statusText;
	status.style.margin = '5px';
	status.style.color = 'deeppink';
	status.style.fontSize = '1em';
	status.style['word-break'] = 'break-all';
	status.style.display = 'inline-block';

	const textarea = document.createElement('textarea');
	textarea.id = 'maika-text';
	textarea.readOnly = true;
	textarea.placeholder = 'maika logs';
	textarea.setAttribute('spellcheck', 'false');
	textarea.setAttribute('autocomplete', 'off');
	textarea.setAttribute('autocorrect', 'off');
	textarea.setAttribute('autocapitalize', 'off');
	textarea.style.width = '100%';
	textarea.style.height = '200px';
	textarea.style.boxSizing = 'border-box';
	textarea.style.resize = 'vertical';
	textarea.style.fontFamily = 'monospace';
	textarea.style.fontSize = '0.8em';
	textarea.style.color = '#eee';
	textarea.style['background-color'] = '#111';
	textarea.style.display = 'none';

	const draft = document.createElement('textarea');
	draft.id = 'maika-draft';
	draft.placeholder = 'drafting';
	draft.setAttribute('spellcheck', 'false');
	draft.setAttribute('autocomplete', 'off');
	draft.setAttribute('autocorrect', 'off');
	draft.setAttribute('autocapitalize', 'off');
	draft.style.width = '100%';
	draft.style.height = '100px';
	draft.style.padding = '8px';
	draft.style.boxSizing = 'border-box';
	draft.style.resize = 'vertical';
	draft.style.fontFamily = 'monospace';
	draft.style.fontSize = '1em';
	draft.style.color = 'royalblue';
	draft.style['background-color'] = '#111';
	draft.style.display = 'none';

	const seldraft = document.createElement('select');
	seldraft.style.display = 'none';
	seldraft.style.width = '340px';
	prepareSelect(seldraft);

	const selpost = document.createElement('select');
	selpost.style.display = 'none';
	selpost.style.width = '340px';
	prepareSelect(selpost);

	const chat = document.createElement('button');
	chat.id = 'maika-chat';
	chat.textContent = 'Chat';
	chat.style.fontFamily = 'monospace';
	chat.style.backgroundColor = 'blue';
	chat.style.color = 'white';
	chat.style.border = 'none';
	chat.style.padding = '4px 6px';
	chat.style.cursor = 'pointer';
	chat.style.margin = '2px';
	chat.style.display = 'none';
	chat.addEventListener('click', async () => {
		console.clear();
		await parseConversation();
		await parseConversationList();
	});

	const reset = document.createElement('button');
	reset.id = 'maika-reset';
	reset.textContent = 'Reset';
	reset.style.fontFamily = 'monospace';
	reset.style.backgroundColor = 'red';
	reset.style.color = 'white';
	reset.style.border = 'none';
	reset.style.padding = '4px 6px';
	reset.style.cursor = 'pointer';
	reset.style.margin = '2px';
	reset.addEventListener('click', () => {
		localStorage.clear();
		location.reload();
	});

	const bloom = document.createElement('button');
	bloom.id = 'maika-bloom';
	bloom.textContent = 'Bloom';
	bloom.style.fontFamily = 'monospace';
	bloom.style.backgroundColor = 'green';
	bloom.style.color = 'white';
	bloom.style.border = 'none';
	bloom.style.padding = '4px 6px';
	bloom.style.cursor = 'pointer';
	bloom.style.margin = '2px';
	bloom.style.display = 'none';
	bloom.addEventListener('click', () => {
		console.clear();
		irrelevant.style.display = 'none';
		autoParser({auto: true})
	});

	const bloomed = document.createElement('button');
	bloomed.id = 'maika-bloomed';
	bloomed.textContent = 'Bloomed';
	bloomed.style.fontFamily = 'monospace';
	bloomed.style.backgroundColor = 'orange';
	bloomed.style.color = 'white';
	bloomed.style.border = 'none';
	bloomed.style.padding = '4px 6px';
	bloomed.style.cursor = 'pointer';
	bloomed.style.margin = '2px';
	bloomed.style.display = 'none';

	const irrelevant = document.createElement('button');
	irrelevant.id = 'maika-irrelevant';
	irrelevant.textContent = 'Irrelevant';
	irrelevant.style.fontFamily = 'monospace';
	irrelevant.style.backgroundColor = 'red';
	irrelevant.style.color = 'white';
	irrelevant.style.border = 'none';
	irrelevant.style.padding = '4px 6px';
	irrelevant.style.cursor = 'pointer';
	irrelevant.style.margin = '2px';
	irrelevant.style.display = 'none';
	irrelevant.addEventListener('click', () => {
		autoParser({auto: true, irrelevant: true})
	});

	const pause = document.createElement('button');
	pause.id = 'maika-pause';
	pause.textContent = 'Pause';
	pause.style.fontFamily = 'monospace';
	pause.style.backgroundColor = 'orange';
	pause.style.color = 'white';
	pause.style.border = 'none';
	pause.style.padding = '4px 6px';
	pause.style.cursor = 'pointer';
	pause.style.margin = '2px';
	pause.addEventListener('click', () => {
		if (localStorage.getItem('pause')) {
			localStorage.removeItem('pause');
			pause.textContent = 'Pause';
			pause.style.backgroundColor = 'orange';
		} else {
			localStorage.setItem('pause', new Date());
			pause.textContent = 'Resume';
			pause.style.backgroundColor = 'lime';
		}
	});

	const sentinel = document.createElement('button');
	sentinel.id = 'maika-sentinel';
	sentinel.textContent = 'Sentinel';
	sentinel.style.fontFamily = 'monospace';
	sentinel.style.backgroundColor = 'blue';
	sentinel.style.color = 'white';
	sentinel.style.border = 'none';
	sentinel.style.padding = '4px 6px';
	sentinel.style.cursor = 'pointer';
	sentinel.style.margin = '2px';
	sentinel.addEventListener('click', () => {
		pullGeneratedPost();
	});

	const cids = document.createElement('select');
	prepareSelect(cids);
	cids.addEventListener("change", function() {
		CUSTOMER.cid = cids.value;
		bloom.style.display = 'unset';
		draft.style.display = 'unset';
		textarea.style.display = 'unset';

		if (CUSTOMER.cid == 'maika') {
			chat.style.display = 'unset';
		}

		prepareCid();
		console.clear?.();
	});
	cids.reinit('CID,maika,haisanmesom,nabu'.split(','));

	mini.addEventListener('click', async () => {
		window.close();
		if (mini.textContent == '▼') {
			mini.textContent = '▲';
			cids.style.display = 'none';
			status.style.display = 'none';
			bloom.style.display = 'none';
			draft.style.display = 'none';
			chat.style.display = 'none';
			irrelevant.style.display = 'none';
			textarea.style.display = 'none';
		} else {
			mini.textContent = '▼';
			cids.style.display = 'unset';
			status.style.display = 'inline-block';
			bloom.style.display = 'unset';
			draft.style.display = 'unset';
			irrelevant.style.display = 'unset';
			textarea.style.display = 'unset';
			if (CUSTOMER.cid == 'maika') {
				chat.style.display = 'unset';
			}
		}
	});

	floater.appendChild(mini);
	floater.appendChild(title);
	floater.appendChild(cids);
	floater.appendChild(status);
	floater.appendChild(textarea);
	floater.appendChild(draft);
	// floater.appendChild(reset);
	// floater.appendChild(pause);
	floater.appendChild(bloom);
	floater.appendChild(sentinel);
	floater.appendChild(irrelevant);
	floater.appendChild(chat);
	floater.appendChild(seldraft);
	floater.appendChild(bloomed);
	floater.appendChild(select);


	document.body.appendChild(floater);

	setInterval(autoParser, 1e3);

	ENV.UI = { cids, floater, mini, title, status, textarea, reset, pause, bloom, sentinel, bloomed, draft, chat, select, checkbox, seldraft, irrelevant };

	makeDraggable(floater, title);

	return ENV.UI;
}