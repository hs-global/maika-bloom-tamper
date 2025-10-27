/*---PROCESSORS---*/
async function autoParser(options={}) { try {
	if (!options.auto && ENV.lock.autoParser) return;

	clearInterval(ENV.UI.interval);

	// ENV.UI.bloom.disabled = true;

	let site_type = 'home';
	let parsed = null;
	let key = 'autoParser:' + location.href;

	let params = Object.fromEntries(new URLSearchParams(location.search).entries());
	let {cmd, cid} = params;

	if (cmd) {
		ENV.lock.cmd = cmd;

		if (cmd == 'parsePostPage') {
			let post_id = new URL(location.href).pathname.split('/')?.[4]?.match(/\d+/)?.[0];

			let found_processed = CUSTOMER.cid ? await aquery(`
				FOR i in C
				FILTER '${CUSTOMER.cid}' IN i.cids
					&& i.type == 'facebook.post' && i.id == ${JSON.stringify(post_id)}
				LIMIT 1
				RETURN i
			`, true) : null;

			log(found_processed, 'found_processed');

			if (found_processed) {
				document.title = found_processed._id;
				// return;
			} else {
				document.title = cmd;

				ENV.UI.draft.style.display = 'unset';
				ENV.UI.textarea.style.display = 'unset';
				ENV.UI.bloom.style.display = 'unset';
			}
		} else {
			document.title = cmd;
		}
	}

	if (cid) {
		CUSTOMER.cid = cid;
		ENV.UI.cids.value = cid;
		await prepareCid();
	}

	let avatar_name = document.querySelectorAll('[role="navigation"]')?.[2]?.querySelectorAll('ul li')?.[0]?.textContent
					|| document.querySelectorAll('[aria-label^="Comment as "]')?.[0]?.getAttribute('aria-label')?.substring(11);

	let avatar_id = [...document.querySelectorAll('script')].find(x => x.textContent.includes('__user='))?.textContent?.match(/__user=(\d+)/)?.[1];

	CUSTOMER.profile_name = avatar_name || CUSTOMER.profile_name;
	CUSTOMER.profile_id = avatar_id;

	ENV.UI.title.textContent = [cmd || '', CUSTOMER.cid, CUSTOMER.profile_name.substr(0, 5), CUSTOMER.profile_id].join('-');
	// log('avatar_name:' + avatar_name);

	ENV.lock.autoParser = true;

	if (options.auto) {
		ENV.UI.seldraft.style.display = 'none';
		ENV.UI.select.style.display = 'none';
	}

	if (!localStorage.getItem(key)) {
		if (~location.href.search(ENV.regex.comment)) {
			site_type = 'comment';
			parsed = (options.auto || cmd == 'parsePostPage') && await parsePostPage(options);
		} else if (~location.href.search(ENV.regex.post)) {
			site_type = 'post';
			parsed = (options.auto || cmd == 'parsePostPage') && await parsePostPage(options);
		} else if (~location.href.search(ENV.regex.group)) {
			site_type = 'group';
			parsed = (options.auto || cmd == 'parseGroupPage') && await parseGroupPage(options);
		} else if (~location.href.search(ENV.regex.messsage)) {
			site_type = 'messsage';
		}
	}

	ENV.UI.status.textContent = site_type;

	if (!cmd) {
		if (CUSTOMER.cid && 'post,comment'.split(',').includes(site_type)) {
			ENV.UI.irrelevant.style.display = 'inline-block';
		} else {
			ENV.UI.irrelevant.style.display = 'none';
		}

		if ('group,post,comment'.split(',').includes(site_type)) {
			ENV.UI.floater.style.left = 'unset';
			ENV.UI.floater.style.right = '10px';
		} else {
			ENV.UI.floater.style.left = '10px';
			ENV.UI.floater.style.right = 'unset';
			await parseNotif();
		}
	}

	if (options.auto || cmd) {
		if (parsed) {
			if (site_type == 'comment') {
				await processPostPage(parsed, site_type);
			} else if (site_type == 'post') {
				await processPostPage(parsed);
			} else if (site_type == 'group' || cmd == 'parseGroupPage') {
				await processGroupPage(parsed);
			}

			localStorage.setItem(key, new Date())
		}
	} else {
		if (site_type == 'group') {
			document.querySelectorAll('[aria-label="Hide menu"]').forEach(x => x.click());
			let links = [...document.querySelectorAll('a[href*="/groups/"]')];
			let group_url = links.find(x => x?.href.includes('/members/'))?.href.replace(/\/members\/?[^/]*/, '') || location.href;
			let group_id = new URL(group_url).pathname.split('/')[2];
			await checkProcessPosts(group_id);
		}
	}

	if (ENV.site_type != site_type) {
		// console.log('Trigger', ENV.site_type, site_type)
		ENV.site_type = site_type;
	}

	if (!cmd) {
		ENV.lock.autoParser = false;
		localStorage.removeItem(key);
	} else {
		if (new URLSearchParams(location.search).get('harvest') != 'true' ) {
			window.title = 'DONE_CLOSING';
			// setTimeout(_ => alert('CMD DONE: ' + cmd), 5e3);
			setTimeout(_ => window?.close?.(), 10e3);
		}
	}

	// ENV.UI.bloom.disabled = false;

} catch (e) { log(e.toString()) } };
async function parseNotif() {
	if (ENV.lock.cmd) return;

	if (SESSION.notifs.size > 0) return;

	document.querySelector('[role="button"][aria-label*="otification"]')?.click();
	await wait (3e3);

	document.querySelector('[role="dialog"][aria-label*="otification"] [aria-label*="notifications"]')?.click();
	await wait (3e3);

	let notifs = [...document.querySelectorAll('a[href*="notif_id"]')]
		.map(x => {
			let url = new URL(x.href);

			let text = x.querySelector('span span').textContent;
			let textReply = [...x.querySelectorAll('span span span')].find(x => ~x.textContent.search(/epl/i))?.textContent;
			let textReact = [...x.querySelectorAll('span span span')].find(x => ~x.textContent.search(/eaction/i))?.textContent;

			let amount = text.match(/\d+/)?.[0] ? (parseInt(text.match(/\d+/)[0]) + 2) : 1;
			let amountReact = textReact?.match(/(\d+)\D*eaction/)?.[0] ? parseInt(textReact.match(/(\d+)\D*eaction/)?.[1]) : 0;
			let amountReply = textReply?.match(/(\d+)\D*epl/)?.[0] ? parseInt(textReply.match(/(\d+)\D*epl/)?.[1]) : 0;

			return {
				"id": new URL(x.href).searchParams.get('notif_id'),
				"cids": ENV?.cids(),
				"profile_name": CUSTOMER?.profile_name,
				"profile_id": CUSTOMER?.profile_id,
				"t": new Date(),
				"type": "facebook.notif",
				"post": url.searchParams.get('multi_permalinks') || url.pathname.split('/')?.[4]?.match(/\d+/)?.[0] || location.href,
				"comment": url.searchParams.get('comment_id'),
				"group": url.pathname.split('/')[2]?.match(/[\d\w\.-_]+/)?.[0],
				"link": url.toString(),
				"text": text,
				"commented": amountReply || (~text.search(/commented/) ? amount : 0),
				"reacted": amountReact || (~text.search(/(reacted|like)/) ? amount : 0),
			}
		})
		.filter(x => !SESSION.notifs.has(x.id));

	let upserteds = await aquery(`
		LET items = ${JSON.stringify(notifs)}

		FOR i in items
			UPSERT { type: i.type, id: i.id }
			INSERT i
			UPDATE i
			IN C
			RETURN NEW
	`);

	notifs.forEach(x => SESSION.notifs.add(x.id));

	console.log('notifs', notifs, upserteds);
};
async function pullGeneratedPost() {
	if (!CUSTOMER.cid) return console.log('NO_CID');

	let posts = await aquery(`
		LET cid = '${CUSTOMER.cid}'
		FOR i in C
		FILTER cid in i.cids
			&& i.state == 'generated'
			&& i.from.maika
		COLLECT post = i.post, group = i.group INTO items
		RETURN {
			group, post, items: items[*].i,
		}
	`);

	let items = [];
	posts.forEach(p => {
		p.items.forEach(x => {
			if (!x.message) return;

			if (x.type == 'facebook.reply' && x.comment) {
				let url = new URL(x.link);
				url.searchParams.set('harvest', 'true');
				url.searchParams.set('arango_key', encodeURIComponent(x._key));
				url.searchParams.set('comment_id', x.comment);
				x.link = url.toString();
				items.push(x);
			}

			if (x.type == 'facebook.comment' && x.post) {
				let url = new URL(x.link);
				url.searchParams.set('harvest', 'true');
				url.searchParams.set('arango_key', encodeURIComponent(x._key));
				x.link = url.toString();
				items.push(x);
			}
		});
	});

	ENV.UI.selpost.reinit( items.map(x => [x.group, x.post, x._key, x.message].join('|')) );
	ENV.UI.selpost.style.display = 'block';
	ENV.UI.selpost.addEventListener('change', event => {
		let [group, post, _key] = (ENV.UI.selpost.value || '').split('|');
		let item = items.find(x => x._key == _key);
		window.open(item.link, '_blank');
	});

	console.log('pullGeneratedPost', posts);
}
/**/
async function checkProcessPosts(group_id) {
	if (!CUSTOMER.cid || !group_id || ENV.lock.cmd) return;

	let processed_post_ids = await aquery(`
		FOR i in C
		FILTER '${CUSTOMER.cid}' IN i.cids
			${group_id ? `&& i.group == ${JSON.stringify(group_id)}` : ''}
			&& ( (i.llm && i.from.maika && i.post) || (i.type == 'facebook.post' && POSITION(i.label, 'irrelevant')) )
		SORT i.t DESC LIMIT 100
		RETURN DISTINCT(i.post || i.id)
	`);

	// if (!processed_post_ids?.length) return;

	let posts = [...document.querySelectorAll('[role="feed"] .html-div:not([role="feed"] .html-div .html-div)')];

	let processed_posts = posts.filter(x => processed_post_ids.find(i => x.querySelector(`a[href*="${i}"]`)));

	processed_posts.forEach(p => {
		p.querySelector('[style]').style.backgroundColor = 'darkgreen';
		p.querySelector('[style]').style['height'] = '60px';
	});

	let not_processed_posts = posts.filter(x => !processed_post_ids.find(i => x.querySelector(`a[href*="${i}"]`)))
									.map(x => x.querySelector('a[href*="/posts/"]')?.href)
									.filter(x => x)
									.map(x => {
										let url = new URL(cleanLink(x));

										url.searchParams.set('cmd', 'parsePostPage');
										url.searchParams.set('cid', CUSTOMER.cid);
										url.searchParams.delete('comment_id');
										url.searchParams.delete('reply_comment_id');

										return url.toString();
									})
									.filter(x => !SESSION.checkProcessPosts.has(x));

	log(not_processed_posts.length);

	for (let url of not_processed_posts.slice(0, 1)) {
		console.log('checkProcessPosts', url);

		SESSION.checkProcessPosts.add(url);
		let post_tab = window.open(url, '_blank');

		await wait(10e3);
		// setTimeout(() => post_tab?.close?.(), 30e3);
	}

	return processed_post_ids;
};
async function buildCommunityProfile(group_found) {
	if (!group_found) return group_found;

	let community_information = [
		'#Location', group_found.location,
		'#Title', group_found.title,
		'#About', group_found.about,
	].join('\n');

	ENV.UI.draft.value = `${new Date()}\nllm_gen.write_community_summary...`;
	let llm = await llmgen({
		cid: 'bloom',
		token: 'llm_gen.write_community_summary#',
		data: {community_information}
	});
	ENV.UI.draft.value = `${new Date()}\nllm_gen.write_community_summary.done`;
	console.log('llm', community_information, llm);

	group_found.community_profile = llm?.data;

	let updated = await aquery(`
		UPDATE { _key: ${JSON.stringify(group_found._key)} }
		WITH { community_profile: ${JSON.stringify(group_found.community_profile)} }
		IN C
		RETURN NEW
	`, true);

	log(updated, 'updated');

	return updated;
};
async function processGroupPage(parsed) {
	if (!CUSTOMER.cid || !parsed) return;

	localStorage.setItem('working', JSON.stringify(parsed));

	let {group, posts, feed} = parsed;

	// ENV.UI.status.textContent = group.url;

	let group_found = await aquery(`
		FOR i in C
		FILTER i.type == 'facebook.group'
			&& (i.id == ${JSON.stringify(group.id)} ${group.alias ? `|| i.alias == ${JSON.stringify(group.alias)}` : ''} )
		LIMIT 1
		RETURN i
	`, true);

	console.log('group_found', group_found);

	log(group_found);

	if (!group_found) {
		group_found = await aquery(`INSERT ${JSON.stringify(group)} IN C RETURN NEW`, true);
		log(group_found, 'upserted');
	}

	if (!group_found.community_profile) {
		group_found = await buildCommunityProfile(group_found);
	}

	console.log({group_found})

	if (group_found) {
		ENV.UI.draft.value = '# community_profile:\n' + group_found?.community_profile;
	} else {
		alert('ERROR buildCommunityProfile, please RETRY');
	}

	// let pcbs = [...document.querySelectorAll('a[href*="cft"][href*="pcb"][href*="set"]')];
	// for (let post of parsed.posts) {
	// 	let post_tab = window.open(post.url, '_blank');
	// }

	ENV.UI.status.textContent = 'DONE';
	localStorage.removeItem('working');
};
async function parseGroupPage() {
	if (!CUSTOMER.cid || !~location.href.search(ENV.regex.group)) return [];

	console.clear?.();

	localStorage.setItem('working', JSON.stringify({parseGroupPage: location.href}));
	ENV.UI.draft.value = '';
	ENV.UI.textarea.value = '';
	ENV.UI.status.textContent = 'View more';

	document.querySelectorAll('[aria-label="Hide menu"]').forEach(x => x.click());

	[...document.querySelectorAll('[role="button"]')]
		.filter(x => ~x.textContent.search(/see more/i))
		.map(async x => {x.click(); await wait(1e3)});

	// [...document.querySelectorAll('[role="button"]')]
	// 	.filter(x => ~x.textContent.search(/view.*repl/i))
	// 	.map(async x => {x.click(); await wait(1e3)});

	let feed = [...document.querySelectorAll('[role="feed"] [data-ad-rendering-role]')].map(x => x.textContent.trim()).filter(x => !'Like,Comment'.split(',').includes(x)).join('\n');
	let about = [...document.querySelectorAll('.html-div [style*="top"]')].find(x => ~x.textContent.search(/About/))?.textContent;
	let title = [...document.querySelectorAll('h1 a[href*="group"]')].map(x => x.textContent).filter(x => !'Notifications,Chats,Groups'.split(',').includes(x)).join(' ');

	let links = [...document.querySelectorAll('a[href*="/groups/"]')];

	let group_url = links.find(x => x.href.includes('/members/'))?.href.replace(/\/members\/?[^/]*/, '');

	if (!group_url) {
		console.log('group_url.none', location.href);
		localStorage.removeItem('working');
		return [];
	}

	let group_id = new URL(group_url).pathname.split('/')[2];

	if (!group_id) {
		console.log('group_id.none', location.href);
		localStorage.removeItem('working');
		return [];
	}

	await checkProcessPosts(group_id);

	let group_alias = document.querySelectorAll('[role="main"] .html-h1 a[href*="/groups/"]')[0]?.href?.split('/')?.[4] || undefined;

	let group_found = await aquery(`
		FOR i in C
		FILTER i.type == 'facebook.group'
			&& (i.id == ${JSON.stringify(group_id)} ${group_alias ? `|| i.alias == ${JSON.stringify(group_alias)}` : ''} )
		LIMIT 1
		UPDATE i with {id: ${JSON.stringify(group_id)}, title: ${JSON.stringify(title)}} IN C
		RETURN NEW
	`, true);

	if (group_found) {
		return {group: group_found};
	}

	await scrollToEnd('body', 0 , 3);

	let pcbs = [...document.querySelectorAll('a[href*="cft"][href*="pcb"][href*="set"]')];
	let processed = {};
	for (let i = 0; i < pcbs.length; i++) {
		let item = pcbs[i];
		let postid = new URL(item.href).searchParams.get('set')?.replace('pcb.', '');

		if (!postid) {
			log(`no postid: ${item.href}\n`);
			continue;
		}

		ENV.UI.status.textContent = `processed: ${i}/${pcbs.length} ${postid}`;

		if (processed[postid]) continue;
		// console.log('mouseEventOf', postid, item.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.textContent);
		mouseEventOf('mousemove', item, 10, 10);
		mouseEventOf('mouseover', item, 10, 10);
		await wait(3e3);

		processed[postid] = true;
	}

	let posts = pcbs.map(x => new URL(x.href))
		.map(x => x.searchParams.get('set').replace('pcb.', ''))
		.map(x => `https://www.facebook.com/groups/${group_id}/posts/${x}`);


	posts = [...new Set(posts)];

	posts = posts.map(url => ({
		url,
		id: new URL(url).pathname.split('/')?.[4]?.match(/\d+/)?.[0] || url,
	}));

	log(posts);

	let parsed = {
		group: {
			cids: ENV.cids(),
			t: new Date(),
			_key: ['facebook.group', group_id].join('-'),
			type: 'facebook.group',
			id: group_id,
			alias: group_alias,
			title,
			about,
			url: `https://facebook.com/${group_id}`,
		},
		posts,
		feed
	};
	console.log(parsed);

	ENV.UI.status.textContent = 'DONE: parseGroupPage';

	localStorage.removeItem('working');
	return parsed;
};
/**/
async function manualGeneratedContent(generated_content, site_type, {llm, post, group_found, index}){
	if (!CUSTOMER.cid || !generated_content) return false;

	console.log('manualGeneratedContent:', llm);

	if (llm?.action_command == 'reply_to_user') {
		let timeofComment = [...document.querySelectorAll('a[href*="comment_id"]')].find(x => x.href.includes(llm.id));

		document.querySelectorAll(`div[style*="background-color: ${ENV.focuscolor}"]`).forEach(ele => ele.style['background-color'] = 'unset');

		if (timeofComment) {
			clickfocusDOM(timeofComment);
			await new Promise(res => setTimeout(res, 3e3));
			timeofComment = [...document.querySelectorAll('a[href*="comment_id"]')].find(x => x.href.includes(llm.id)); // Because layout shifted

			let query = [
				'[aria-placeholder*="eply"][contenteditable="true"]',
			].join(',');

			clickfocusDOM(parentOf(timeofComment, 10, query, 0));
		}
	} else {
		let query = [
			'[aria-placeholder*="omment"][contenteditable="true"]',
			'[aria-placeholder^="Answer as"][contenteditable="true"]',
			'[aria-placeholder^="Comment as"][contenteditable="true"]',
			`[aria-placeholder*="${CUSTOMER.profile_name}"][contenteditable="true"]`,
		].join(',');

		clickfocusDOM(document.querySelectorAll(query)[0]);
	}

	generated_content = generated_content?.content || generated_content?.messsage || generated_content?.text || generated_content;

	text2Clipboard(generated_content, index);

	let maika_resp = llm.maika_resp;
	maika_resp.link = location.href;
	maika_resp.state = 'draft';

	let responsed = await aquery(`
		UPSERT { id: ${JSON.stringify(maika_resp.id)} }
		INSERT ${JSON.stringify(maika_resp)}
		UPDATE ${JSON.stringify(maika_resp)}
		IN C
		RETURN NEW
	`, true);

	maika_resp = responsed || maika_resp;

	// ENV.UI.textarea.value += '## ARANGO RESPONSED:\n' +  JSON.stringify(responsed) + '\n';

	ENV.UI.bloomed.textContent = [
		(llm?.action_command == 'reply_to_user' ? 'R' : 'C'),
		index,
		llm.id,
	].join('-');

	ENV.UI.select.style.display = 'inline-block';
	ENV.UI.bloomed.style.display = 'inline-block';
	ENV.UI.bloomed.addEventListener('click', () => {
		clearInterval(ENV.UI.interval);
		ENV.UI.seldraft.disabled = false;
		ENV.UI.select.style.display = 'none';
		ENV.UI.bloomed.style.display = 'none';
		aquery(`UPDATE { _key: ${JSON.stringify(maika_resp._key)}, state: 'sent' } IN C RETURN NEW`, true)
			.then(updated => log(updated))
			.catch(ex => log('rating:' + ex.message));

	}, { once: true });

	ENV.UI.select.reinit('neutral,good,bad'.split(','));
	ENV.UI.select.addEventListener('change', event => {
		maika_resp.rating = ENV.UI.select.value;
		aquery(`
			UPDATE {
				_key: ${JSON.stringify(maika_resp._key)},
				rating: ${JSON.stringify(maika_resp.rating)}
			}
			IN C
			RETURN NEW
		`, true)
		.then(updated => log(updated))
		.catch(ex => log('rating:' + ex.message));
	}, { once: true });

	let isCommentExisted = await new Promise(resolve => {
		let count = 10;

		let flasher = flashTitle(1e3, [(llm?.action_command == 'reply_to_user') ? `>REPLY[${index}]` : '>COMMENT'], resolve);
		ENV.UI.interval = setInterval(async () => {
			if (count <= 0) {
				clearInterval(ENV.UI?.interval);
				return flasher();
			}

			if (location.href != maika_resp.link) {
				clearInterval(ENV.UI?.interval);
				return flasher();
			}

			count--;
			ENV.UI.status.textContent = `[${count}] ${llm.id}`;
			if (localStorage.getItem('pause')) {
				clearInterval(ENV.UI?.interval);
				return console.log('pause.isCommentExisted');
			}

			let comments = [...document.querySelectorAll(`[aria-label^="Reply by"] a[href*="reply_comment_id="],[aria-label^="Comment by"] a[href*="comment_id="]`)]
								.map(x => parentOf(x, 7, '[dir="auto"]', 1));
			let found = comments.find(x => x.textContent?.includes(document.querySelector('#maika-draft').value.trim()))
						|| comments.find(x => x.parentNode.parentNode.querySelector('a')?.textContent == CUSTOMER.profile_name);
			found = parentOf(found, 7, 'a[href*="comment_id="]', 0)?.href
				|| document.querySelectorAll(`[aria-label^="Comment by ${CUSTOMER.profile_name}"] a[href*="comment_id="]`)?.[0]?.href
				|| document.querySelectorAll(`[aria-label^="Reply by ${CUSTOMER.profile_name}"] a[href*="reply_comment_id="]`)?.[0]?.href;

			if (found) {
				clearInterval(ENV.UI?.interval);

				return flasher(found);

				// if (window.confirm(`DONE: [${index}] <${llm.id}> "${generated_content}"?`)) {
				// 	return flasher(found);
				// } else {
				// 	return;
				// }
			}
		}, 5e3);
	});

	clearInterval(ENV.UI.interval);

	if (isCommentExisted) {
		log(index + ' > isCommentExisted');

		maika_resp.link = isCommentExisted;
		maika_resp.state = 'sent';
		maika_resp.rating = ENV.UI.select.value;

		responsed = await aquery(`UPDATE ${JSON.stringify(maika_resp)} IN C RETURN NEW`, true);

		return responsed;
	}

	return maika_resp;
};
async function processPostPage(parsed, site_type='post') {
	if (!CUSTOMER.cid || !parsed) return;

	let found_processed = (parsed.post?.id && CUSTOMER.cid) ? await aquery(`
		FOR i in C
		FILTER '${CUSTOMER.cid}' IN i.cids
			&& i.llm && i.post == ${JSON.stringify(parsed.post.id)}
		LIMIT 1
		RETURN i
	`, true) : null;

	if (found_processed) {
		console.log('processPostPage.found_processed', found_processed);
		// return log(found_processed, 'found_processed');
	}

	localStorage.setItem('working', JSON.stringify({parseGroupPage: location.href}));

	if (ENV.UI.interval) {
		clearInterval(ENV.UI.interval);
		delete ENV.UI.interval;
	}

	let {post, comments, replies} = parsed;

	let items = [post, ...comments, ...replies];

	let processed_post_ids = await checkProcessPosts(post.group);
	console.log({parsed, processed_post_ids});

	if (processed_post_ids?.includes(post.id)) {
		let dialog = document.querySelectorAll('[role="dialog"] [role="dialog"] .html-div')[0];
		if (dialog) {
			dialog.style['background-color'] = 'darkgreen';
		}
	}

	let upserteds = await aquery(`
		LET items = ${JSON.stringify(items)}

		FOR i in items
			UPSERT { type: i.type, id: i.id }
			INSERT i
			UPDATE i
			IN C
			RETURN NEW
	`);
	console.log('upserteds.parsed', upserteds);

	if (post?.label?.includes?.('irrelevant')) {
		return alert(`${post.id} marked as IRRELEVANT`);
	}

	comments = comments.filter(x =>
		x.from.name != CUSTOMER.profile_name
		&& x.from.name != post.from.name
		&& x?.message?.length
		&& !x.from.maika
		&& x.from.url
		&& !x?.from?.name?.includes('Anonymous participant')
	);

	// log('Arango upserteds:\n' +  YAML.stringify(upserteds) + '\n');

	let group_id = post?.from?.url?.match(/groups\/(\d+)\//)?.[1] || post?.url?.match(/groups\/(\d+)\//)?.[1] || post.group;

	let group_found = await aquery(`
		FOR i in C
		FILTER i.type == 'facebook.group'
			&& i.id == ${JSON.stringify(group_id)}
		LIMIT 1
		RETURN i
	`, true);

	console.log('group_found: ', group_found, 'post: ', post);

	if (!group_found?.community_profile) {
		if (!window.confirm(`WARNING: Group ${group_id}.community_profile is empty, ignore?`)) {
			return window.open(`https://www.facebook.com/${post.group}`, '_blank');
		}
	}

	// log(group_found?.community_profile);

	let data = {
		brand_profile: [
			CUSTOMER?.settings?.story || CUSTOMER.cid,
			CUSTOMER?.settings?.products ? (`## Products:\n` + CUSTOMER?.settings?.products) : '',
		].join('\n'),
		community_information: (group_found?.community_profile || group_found?.about || post.fanpage || 'My general Facebook news feed'),
	};

	const cleanPost4LLM = (post_origin) => {
		let post = JSON.parse(JSON.stringify(post_origin));

		delete post.url;delete post.link;
		if (post?.from?.url) delete post.from.url;

		post.images?.forEach((z, k) => {
			delete post.images[k].src;
		});

		post.comments?.forEach((x, i) => {
			if (!post.comments[i]) return;

			delete post.comments[i].url;
			delete post.comments[i].link;
			delete post.comments[i].post;
			delete post.comments[i].group;
			delete post.comments[i].label;
			delete post.comments[i].cids;
			if (post.comments[i].from?.url) delete post.comments[i].from.url;

			post.comments[i].replies?.forEach((y, j) => {
				delete post.comments[i].replies[j].cids;
				delete post.comments[i].replies[j].post;
				delete post.comments[i].replies[j].group;
				delete post.comments[i].replies[j].type;
				delete post.comments[i].replies[j].url;
				delete post.comments[i].replies[j].link;
				delete post.comments[i].replies[j].cids;
				if (post.comments[i].replies[j]?.from?.url) delete post.comments[i].replies[j].from.url;
			})
		});

		return post;
	}

	post.comments = comments.slice(0, 10);

	console.log(post)

	data.discussion_thread = [
		'<discussion_thread type="yaml">',
			YAML.stringify(cleanPost4LLM(post)),
		'</discussion_thread>',
		'',
		'<current_context>',
			new Date().toString(),
		'</current_context>',
	].join('\n');

	// log(data);

	ENV.UI.draft.value = `${new Date()}\nllm_gen.auto_bloom...`;
	let llm = {};

	let llm_found = await aquery(`
		FOR i IN C
		FILTER '${CUSTOMER.cid}' IN i.cids
			&& i.post == ${JSON.stringify(post.id)}
			&& i.state == 'generated'
			&& i.llm
		SORT i.type ASC
		RETURN i.llm
	`);

	llm = llm_found?.length ? { data: llm_found } : await llmgen({
		cid: 'bloom',
		token: 'llm_gen.auto_bloom#',
		data,
	});
	ENV.UI.draft.value = `${new Date()}\nllm_gen.auto_bloom.done`;
	console.log({llm});

	log(llm?.data);

	ENV.UI.seldraft.style.display = 'block';
	ENV.UI.select.style.display = 'inline-block';

	if (Array.isArray(llm?.data)) {
		log(`---\nMULTI_BLOOM: ${llm?.data.length}`);

		if (llm.data.length > 0) {
			ENV.UI.irrelevant.style.display = 'none';
		}

		if (!llm_found?.length) {
			let maika_resps = llm.data.map(x => {
				let resp = {
					id: [
						CUSTOMER.cid, 'bloom', post.id,
						(x?.action_command == 'comment_on_post') ? null : (x.id.match(/\d{8,}/)?.[0] || x.id)
					].filter(x => x).join('-'),
					cids: ENV.cids(),
					t: new Date(),
					type: (x?.action_command == 'comment_on_post') ? 'facebook.comment' : 'facebook.reply',
					label: CUSTOMER.cid,
					post: post.id,
					comment: (x?.action_command == 'comment_on_post') ? null : x.id,
					group: group_found?.id,
					link: location.href,
					from: {maika: true, name: CUSTOMER.profile_name, id: CUSTOMER.profile_id},
					state: 'generated',
					message: x.generated_content,
					llm: JSON.parse(JSON.stringify(x)),
				};

				x.maika_resp = resp;

				return resp;
			})

			let upserteds = await aquery(`
				LET items = ${JSON.stringify(maika_resps)}

				FOR i in items
					UPSERT { type: i.type, id: i.id }
					INSERT i
					UPDATE i
					IN C
					RETURN NEW
			`);
			console.log('upserteds.maika_resps', upserteds);
		} else {
			console.log('llm_found.length', llm_found.length)
		}

		llm.data = llm.data.filter(x => x.generated_content && !x.action_command.includes('ignore'));
		log(`---\nFILTERED_BLOOM: ${llm?.data.length}`);

		const listener = async (event) => {
			let {llm, post, group_found} = ENV.UI.seldraft.meta || {};
			console.log('value', ENV.UI.seldraft.value);

			let [index, id, action, generated_content] = (ENV.UI.seldraft.value||'').split('|');

			log(`-\n# ${index} ${id}`);
			log(llm.data[index]);

			for (var i = 0; i < 1; i++) {
				let query = '[role="dialog"] [role="article"]';

				log('', `prescrollComment: ${i+1}`);

				if (document.querySelectorAll(query).length)
					document.querySelectorAll(query)[document.querySelectorAll(query).length - 1]?.scrollIntoView?.();

				await wait(1e3);
			}

			if (id && generated_content) {
				ENV.UI.seldraft.disabled = true;
				ENV.UI.bloomed.style.display = 'inline-block';
				await manualGeneratedContent(generated_content, site_type, {llm: llm.data[index], post, group_found, index});
			}
		};

		ENV.UI.seldraft.reinit([
			`REPONSE [${llm.data.length}]`,
			...llm.data.map((x, i) => [
				i,
				comments?.find?.(c => x.id == c?.id)?.from?.name || x.id,
				x.action_command?.split('_')[0],
				x.generated_content
			].join('|'))
		]);
		ENV.UI.seldraft.meta = {llm, post, group_found};
		ENV.UI.seldraft.removeEventListener("change", listener);
		ENV.UI.seldraft.addEventListener("change", listener);

		// for (let i=0; i<llm.data.length;i++) {
		// 	log(`> [${i}] ${llm.id}`);

		// 	let data = llm.data[i];
		// 	let {use_case, context, action_command, id, generated_content, reasoning} = data;

		// 	if (!id || !generated_content) {
		// 		text2Clipboard([action_command, reasoning].join(' > '), i);
		// 		continue;
		// 	}

		// 	await manualGeneratedContent(generated_content, site_type, {llm: data, post, group_found, index: i});
		// }
	} else if (typeof llm.data == 'object') {
		let {generated_content, action_command, reasoning} = llm?.data;

		if (!generated_content) {
			text2Clipboard([action_command, reasoning].join(' > '));
		} else {
			await manualGeneratedContent(generated_content, site_type, {llm: llm.data, post, group_found});
		}
	}

	localStorage.removeItem('working');
};
async function parsePostPage(options={}) {
	if (!CUSTOMER.cid || !~location.href.search(ENV.regex.post)) return {};
	console.clear?.();

	localStorage.setItem('working', JSON.stringify({parsePostPage: location.href}));
	ENV.UI.draft.value = '';
	ENV.UI.textarea.value = '';
	ENV.UI.status.textContent = location.href;

	document.querySelectorAll('[aria-label="Hide menu"]').forEach(x => x.click());
	document.querySelectorAll('[role="dialog"] [data-ad-rendering-role="story_message"]')[0]?.click();

	for (var i = 0; i < 1; i++) {
		let query = '[role="dialog"] [role="article"]';

		log('', `scrollComment: ${i+1}`);

		if (document.querySelectorAll(query).length)
			document.querySelectorAll(query)[document.querySelectorAll(query).length - 1]?.scrollIntoView?.();

		await wait(3e3);

		[...document.querySelectorAll('[role="dialog"] [role="button"]')]
			.filter(x => ~x.textContent.search(/view.*repl/i))
			.map(async x => {x.click();});
	}

	let group_url = (	[...document.querySelectorAll('[role="dialog"] a[href*="/groups/"]')]
							.find(x => x.href.includes('/members/') || x.href.includes('?__cft__[0]=') || x.href.includes('/user/'))?.href
						||	document.querySelectorAll('[role="main"] .html-h1 a[href*="/groups/"]')[0]?.href
						|| 	document.querySelectorAll('[role="dialog"] [data-ad-rendering-role="profile_name"] h3 a[href*="/groups/"]')[0].href
	)?.replace(/\/members\/?[^/]*/, '').replace(/\?__cft__[^/]*/, '');

	let post = {
		cids: ENV.cids(),
		t: new Date(),
		type: 'facebook.post',
		group: new URL(group_url || location).pathname.split('/')[2]?.match(/[\d\w\.-_]+/)?.[0],
		url: cleanLink(location.href),
		id: new URL(location).searchParams.get('multi_permalinks') || new URL(location).pathname.split('/')?.[4]?.match(/\d+/)?.[0] || location.href,
		fanpage: document.querySelector('[role="dialog"] [data-ad-rendering-role="profile_name"]')?.textContent,
		from: {
			url: cleanLink([...document.querySelectorAll('[role="dialog"] [href*="/user/"]')].filter(x => x?.textContent)?.[0]?.href),
			name: [...document.querySelectorAll('[role="dialog"] [href*="/user/"] span')].filter(x => x?.textContent)?.[0]?.textContent,
		},
		message: document.querySelector('[role="dialog"] [data-ad-rendering-role="story_message"]')?.textContent,
		images: [...document.querySelectorAll('[role="dialog"] a[aria-label] img[src*="scontent"]')]
					.map(x => ({src: x.src, meta: parentOf(x, 5, 'a[aria-label]', 0)?.getAttribute?.('aria-label') }) ),
		label: [options.irrelevant ? 'irrelevant' : null].filter(x => x),
		reacted: [...document.querySelectorAll('[role="dialog"] .html-span')].find(x => x.textContent.includes('comments'))?.textContent,
		reactions: [...document.querySelectorAll('[role="dialog"] span[role="toolbar"][aria-label*="reacted"] img')].map(x => mapReaction(x.src)),
	};

	log(post);

	let replieds = [...document.querySelectorAll('[role="dialog"] span.html-span')].filter(x => x.textContent.includes('replied'));
	replieds.forEach(x => x.click());

	let comments = [...document.querySelectorAll('[role="dialog"] [role="article"]')];

	comments = comments.map(x => ({
		cids: ENV.cids(),
		t: new Date(),
		type: 'facebook.comment',
		post: post.id,
		group: post.group,
		label: x.getAttribute('aria-label'),
		url: cleanLink([...x.querySelectorAll('a[role="link"][href*="comment_id="]')].map(x => x.href)[0]),
		from: {
			name: x.querySelector('a[role="link"] span')?.textContent,
			url: cleanLink(x.querySelector('a[role="link"]')?.href),
			maika: x.querySelector('a[role="link"]')?.href?.includes(CUSTOMER.profile_id) || undefined,
		},
		message: x.querySelector('span[dir="auto"][lang],[dir="auto"][style*="text"]')?.textContent,
		reacted: x.querySelector('[aria-label*="reacted"][role="button"]')?.getAttribute('aria-label')?.split(';')?.[0],
		reactions: [...x.querySelectorAll('[aria-label*="reacted"][role="button"] span>img[role="presentation"]')].map(x => mapReaction(x.src)),
	}));

	comments.forEach(x => {
		x.id = x.url;

		let url = null;
		try {url = new URL(x.url)} catch {return};

		if (!url) return;

		x.id = url.searchParams.get('comment_id');
	});

	let replies = [];

	for (var i = comments.length - 1; i >= 0; i--) {
		if (!comments[i]?.label?.includes('Reply by')) continue;

		for (var j = i - 1; j >= 0; j--) {
			if (comments[j]?.label?.includes('Reply by')) continue;

			comments[i].type = 'facebook.reply';
			comments[j].replies = comments[j].replies || [];
			comments[i].comment = comments[j].id

			comments[j].replies.push(comments[i].id);
			replies.push(comments[i]);

			comments.splice(i, 1);
			break;
		}
	}

	log(comments);

	ENV.UI.status.textContent = 'DONE: parsePostPage';

	localStorage.removeItem('working');

	return {post, comments, replies};
};
/**/
async function parseConversationList() {
	if (!CUSTOMER.cid || !location.href.includes('/messages/')) return log('Not in /messages/', 'parseConversationList');
	console.clear?.();
	localStorage.setItem('working', JSON.stringify({task: 'CHAT'}));

	let conversations = [...document.querySelectorAll('[aria-label="Chats"][role="grid"] [role="link"][href^="/messages/"]')];

	conversations = conversations.map(x => ({
		_DOM: x,
		url: x.href,
		name: [...x.querySelectorAll('span[dir="auto"]')].filter(x => x.textContent?.length)?.[0]?.textContent,
		unread: x.querySelector('[role="button"] [role="none"]') ? true : false,
	}) );


	let unreads = conversations.filter(x => x.unread);

	if (unreads.length) {
		let first_unread = unreads?.[0];

		log(first_unread.name);

		first_unread?._DOM?.click?.();
		await parseConversation()
	} else {
		log('No unread conversation');
	}

	localStorage.removeItem('working');

	return conversations;
}
async function parseConversation(fanpage) {
	if (fanpage && !location.href.includes(fanpage)) {
		location.href = fanpage;
		await wait(3e3);
	}

	localStorage.setItem('working', JSON.stringify({parseConversation: location.href}));

	log('', 'parseConversation', true);

	if (!location.href.includes('/messages/')) return log('Not in /messages/', 'parseConversation');

	await waitForElement('[aria-label*="Messages in conversation"]');

	let a_links = [...document.querySelectorAll('[role="main"] a[role="link"]')];

	let profile_href = a_links?.[0].href;
	// log({profile_href});
	let profile = '';

	if (profile_href) {
		let existed = await aquery(`
			FOR i in C
			FILTER i.type == 'facebook.profile'
				&& i.id == ${JSON.stringify(profile_href)}
			LIMIT 1
			RETURN i
		`, true);
		log({existed})

		if (existed?.summary) {
			log('profile existed')
			profile = existed.summary;
		} else {
			log('crawling profile in new tab')
			await new Promise(resolve => {
				let newtab = window.open(profile_href, '_blank');
				newtab.addEventListener('load', event => {
					setTimeout(async () => {
						let social_content = [...newtab.document.querySelectorAll('[role="main"] .html-div [style^="border-radius"]')]
									.filter(x => x.textContent)
									.map(x => x.textContent);

						let user_information = YAML.stringify({
							name: a_links?.[0]?.textContent,
							social_content,
						});

						newtab.close();

						log('llm_gen.write_user_profile#')
						let llm = await llmgen({
							cid: 'bloom',
							token: 'llm_gen.write_user_profile#',
							data: {user_information},
						});

						log(llm.data);

						let summary = llm.data;

						profile = summary;

						let profile_item = {
							cids: ENV.cids(),
							type: 'facebook.profile',
							id: profile_href,
							summary: summary,
						};

						log(profile_item);

						let upserted = await aquery(`
							UPSERT { type: 'facebook.profile', id: ${JSON.stringify(profile_href)} }
							INSERT ${JSON.stringify(profile_item)}
							UPDATE ${JSON.stringify(profile_item)}
							IN C
							RETURN NEW
						`, true);

						log({upserted});

						return resolve(true);
					}, 2e3)
				});
				window.focus();
			})
		}
	}

	let queryMsgs = '[aria-label*="Messages in conversation"] [data-scope="messages_table"][role="gridcell"]';

	for (var i = 0; i < 5; i++) {
		log(`conversation.scroll: ${i+1}/10`);
		document.querySelector(queryMsgs)?.scrollIntoView();
		await wait(1e3);
	}

	let msgs = [...document.querySelectorAll(queryMsgs)];
	msgs[msgs.length - 1].scrollIntoView();
	msgs = msgs.filter(x => x.querySelector('[role="presentation"] > span > [class*="html-div"]'));
	msgs = msgs.map(x => ({
		_DOM: x,
		from: x.querySelector('h5')?.textContent,
		messsage: x.querySelector('[role="presentation"] > span > [class*="html-div"]').textContent,
	}));

	msgs.forEach(x => {
		x.from = (!x.from || ~x.from.search(/you (sent|replied)/i)) ? CUSTOMER.profile_name : x.from;
	});

	if (msgs.length) {
		let items = [];

		for (var i = 0; i < msgs.length; i++) {
			if (!msgs[i].messsage) continue;

			let item = {
				cids: ENV.cids(),
				type: 'facebook.messsage',
				id: await digest(msgs[i].from + msgs[i].messsage),
				profile: profile_href,
				from: msgs[i].from,
				messsage: msgs[i].messsage,
			};

			console.log(item);

			items.push(item);
		}

		let upserteds = await aquery(`
			LET items = ${JSON.stringify(items)}

			FOR i in items
				UPSERT { type: i.type, id: i.id }
				INSERT i
				UPDATE i
				IN C
				RETURN NEW
		`);
		console.log('upserteds', upserteds);
	}

	let history = msgs.map(x => `${x.from == CUSTOMER.profile_name ? '> MODEL' : '- USER'}: ${x.messsage}`).join('\n');
	log(history);

	if (msgs[msgs.length-1].from != CUSTOMER.profile_name) {
		log('LLM GEN REPLY:' + document.querySelector('.html-h2')?.textContent);

		ENV.UI.draft.value = `${new Date()}\nmdw.msg_proc_llm...`;
		let prompt = {
			customer_profile: [
				'<CUSTOMER_PROFILE>',
					msgs.find(x => x.from != CUSTOMER.profile_name)?.from || '',
					profile,
				'</CUSTOMER_PROFILE>',
			].join('\n'),
			history: [
				'<CONVERSATION_HISTORY>',
				history,
				'</CONVERSATION_HISTORY>',
			].join('\n'),
		};
		log(prompt);

		let llm = await llmgen({
			cid: CUSTOMER.cid,
			topic: 'bloom',
			token: 'mdw.msg_proc_llm#',
			data: prompt,
		});
		ENV.UI.draft.value = `${new Date()}\nmdw.msg_proc_llm.done`;

		log(llm?.data?.response || llm);

		let message = llm?.data?.response?.message;

		log({message});

		if (message) {
			text2Clipboard(message);
		} else {
			log('waiting 10s');
			await wait(10e3);
		}
	}

	log('DONE', 'parseConversation');

	localStorage.removeItem('working');

	return msgs;
};