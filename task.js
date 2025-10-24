/*---TASKS---*/
async function taskInboxChat(data={}) {
	if (!CUSTOMER.cid || ENV.lock.cmd) return;

	if (localStorage.getItem('pause')) return console.log('pause.taskInboxChat');

	console.clear?.();

	let {task, facebook_id, fanpage, content} = data;
	console.log('taskInboxChat', data);

	localStorage.setItem('task', JSON.stringify(task));

	if (facebook_id) {
		let conversation_link = document.querySelector(`[aria-label="Chats"][role="grid"] [role="link"][href*="t/${facebook_id}"]`);
		if (conversation_link) {
			conversation_link.click?.();
			await wait(3e3);
		}
	} else if (fanpage) {
		if (!location.href.includes(fanpage)) {
			console.log('goto', fanpage);
			location.href = fanpage;
			await wait(3e3);
		}

		console.log('click');
		await waitForElement('[role="tab"][href$="about"]');
		document.querySelectorAll('[role="tab"][href$="about"]')[0]?.click();

		await waitForElement('[role="tab"][href$="about_profile_transparency"]');
		document.querySelectorAll('[role="tab"][href$="about_profile_transparency"]')[0]?.click();

		for (let closer of [...document.querySelectorAll('[role="button"][aria-label="Close chat"]')]) {
			closer.click();
			await wait(1e3);
		}

		await wait(5e3);
		facebook_id = [...document.querySelectorAll('.html-div span[dir="auto"]')].find(x => x.textContent.match(/\d{10,15}/))?.textContent;
		console.log({facebook_id})

		await wait(1e3);
		document.querySelectorAll('[role="button"][aria-label="Message"]')[0]?.click();
		await wait(1e3);
		document.querySelectorAll('[role="button"][aria-label="Chat settings"]')[0]?.click();
		await wait(1e3);
		document.querySelectorAll('[role="menu"] a[href*="/messages/t"]')[0]?.click()

		await wait(3e3);
		await waitForElement('[role="textbox"][aria-label="Message"]');

		// location.href = `https://www.facebook.com/messages/t/${facebook_id}`;
	}

	let $title = document.querySelector('#maika-title');
	let $text = document.querySelector('#maika-text');

	$title.textContent = [facebook_id, fanpage].join('>');
	text2Clipboard(content);

	let title = document.title;

	let isChatExisted = await new Promise((resolve) => {
		setInterval(async () => {
			if (localStorage.getItem('pause')) return console.log('pause.isChatExisted');

			document.title = new Array(~~(Math.random()*3)).fill('.').join('') + 'waiting ' + title;
			let messages = await parseConversation();

			let found = messages.find(x => {
				if (!x?.messsage) return false;

				let flag = (x.messsage == content)
					|| (Math.abs(x.messsage.length - content.length) / content.length) < 0.01;

				return flag;
			});

			if (found) {
				document.title = 'DONE ' + title;
				return resolve(true);
			}
		}, 1e3);
	});

	if (isChatExisted) {
		task.status = 'success';
		await updateTask(task);

		$title.textContent = [task.Id, task.status].join('>');
		$text.value = '';

		localStorage.removeItem('task');

		return {done: true};
	}
};