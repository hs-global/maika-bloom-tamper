/*---WORKER---*/
async function popTasks() {
	return [];
	console.log('popTasks');
	return fetchJSON(ENV.host.popTasks, {
		headers: {'xc-token': ENV.xc_token}
	}).then(r => r.json()).then(r => r.list).catch();
};

async function updateTask(task) {
	console.log('updateTask', task.Id, task.status);

	return fetchJSON(ENV.host.updateTask, {
		method: 'PATCH',
		headers: {'xc-token': ENV.xc_token},
		body: JSON.stringify([task]),
	});
};

async function handleTask(task) {
	console.log('handleTask');

	let taskResult = {};

	if (task.status != 'processing') {
		task.status = 'processing';
		await updateTask(task);
	}

	document.querySelector('#maika-title').textContent = [task.Id, task.status].join('>');
	document.querySelector('#maika-text').value = JSON.stringify(task, null, 2);

	switch (task.type) {
		case 'inbox': {
			let inboxData = {
				task,
				fanpage: task.to,
				content: task.body,
			};

			taskResult = await taskInboxChat(inboxData);
		} break;
	}

	if (!taskResult.done) return;

	if (!localStorage.getItem('task')) localStorage.removeItem('working');
};

async function routine() {
	if (ENV.lock.cmd) return;

	if (localStorage.getItem('pause')) return console.log('pause.routine');

	// console.log('---')
	// console.log('routine');

	let working = localStorage.getItem('working');
	let task = localStorage.getItem('task');

	// console.log('state:', {working, task});

	if (working) {
		working = JSON.parse(working);
		if (task) {
			task = JSON.parse(task);
			await handleTask(task);
		}
	} else {
		let tasks = await popTasks();

		if (!tasks.length) {
			await wait(5e3);
		} else {
			console.log('tasks', tasks);
			localStorage.setItem('working', JSON.stringify(tasks));
			await handleTask(tasks[0]);
		}
	}

	return setTimeout(routine, 5e3);
};