// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const spawn = require('child_process').spawn;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

function createPanel(obj) {
	if (!obj.panel) {
		let panel = vscode.window.createWebviewPanel(
			'html', // Identifies the type of the webview. Used internally
			'Tinker', // Title of the panel displayed to the user
			vscode.ViewColumn.Beside, // Editor column to show the new webview panel in.
			{ enableScripts: true } // Webview options. More on these later.
		);
		panel.onDidDispose(
			() => {
				obj.hadPanel = false;
				obj.panel = undefined;
			},
			undefined,
			obj.context.subscriptions
		);
		obj.hadPanel = true;
		obj.panel = panel;
	}
	return obj.panel
}
function runner(obj) {
	if (obj.running) {
		clearTimeout(obj.running);
	}
	if (obj.child) {
		obj.child.kill();
	}
	if (obj.hadPanel && !obj.panel) {
		createPanel(obj)
	}
	obj.running = setTimeout(function () {

		let code = obj.document.getText().replace('<?php', '').trim() + ';dd();';
		let child = spawn(vscode.workspace.getConfiguration().get('php.validate.executablePath') || 'php', ['artisan', 'tinker'], {
			cwd: vscode.workspace.workspaceFolders[0].uri.fsPath,
			env: {
				...process.env,
				"VAR_DUMPER_FORMAT": "html",
			},
			stdio: ['pipe', 'pipe', 'pipe']
		});
		obj.child = child;
		let stdoutput = '';
		child.stdout.on('data', (data) => {
			stdoutput += data.toString();
		});
		child.stderr.on('data', (data) => {
			stdoutput += data.toString();
		});
		child.stdout.on('end', () => {
			obj.panel.webview.html = `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>PHP Tinker</title>
			</head>
			<body>${'<pre>' + stdoutput + '</pre>'}<style>html,body {background:#18171B;color:#fff;} * {outline: 0}</style></body ></html > `;
		});
		child.stdin.write(code, () => {
			child.stdin.end();
		})

	}, 300);
}
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let obj = {
		context,
		_template: {
			document: null,
			hadPanel: false,
			running: null,
			child: null,
			text: '',
			context
		},
		editors: new WeakMap()
	};
	let previousDocument = vscode.window.activeTextEditor.document;
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((textEditor) => {
		let document = textEditor.document;
		if (document != previousDocument && obj.editors.has(document)) {
			if (obj.editors.get(document).panel) {
				runner(obj.editors.get(document));
				obj.editors.get(document).hadPanel = true;
			}
		}
		if (document != previousDocument && obj.editors.has(previousDocument) && obj.editors.get(previousDocument).panel) {
			if (obj.editors.get(previousDocument).panel) {
				obj.editors.get(previousDocument).panel.dispose();
				obj.editors.get(previousDocument).hadPanel = true;
			}
		}
		previousDocument = document;
	}));
	context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(textDoc => {
		let document = textDoc;
		if (obj.editors.has(document)) {
			obj.editors.get(document).panel.dispose();
			obj.editors.delete(document);
		}
	}));

	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((changeText) => {
		let document = changeText.textEditor.document;
		if (obj.editors.has(document) && obj.editors.get(document).text !== document.getText()) {
			obj.editors.get(document).text = document.getText()
			runner(obj.editors.get(document));
		}
	}))

	let disposableStop = vscode.commands.registerCommand('php-tinker.tinkerStop', async function () {
		let document = vscode.window.activeTextEditor.document;
		if (obj.editors.has(document)) {
			obj.editors.get(document).panel.dispose();
			obj.editors.delete(document);
		}
	});
	let disposableNew = vscode.commands.registerCommand('php-tinker.tinkerNew', async function () {
		// The code you place here will be executed every time your command is executed
		let document = await vscode.workspace.openTextDocument({ language: 'php', content: '<?php\n' });
		obj.editors.set(document, { ...obj._template });
		obj.editors.get(document).document = document;

		if (!obj.editors.get(document).panel) {
			createPanel(obj.editors.get(document));
		}
		await vscode.window.showTextDocument(document, { preserveFocus: true, preview: false, viewColumn: vscode.ViewColumn.One });
		if (document.getText() !== '<?php\n') {
			runner(obj.editors.get(document));
		}

		obj.editors.get(document).text = document.getText();
	});

	let disposableHere = vscode.commands.registerCommand('php-tinker.tinkerHere', async function () {
		// The code you place here will be executed every time your command is executed
		let document = vscode.window.activeTextEditor.document;
		if (!obj.editors.has(document)) {
			obj.editors.set(document, { ...obj._template });
			obj.editors.get(document).document = document;
			vscode.workspace
			if (!obj.editors.get(document).panel) {
				createPanel(obj.editors.get(document));
			}
			await vscode.window.showTextDocument(document, { preserveFocus: true, preview: false, viewColumn: vscode.ViewColumn.One });
			if (document.getText() !== '<?php\n') {
				runner(obj.editors.get(document));
			}

			obj.editors.get(document).text = document.getText();
		}
	});

	context.subscriptions.push(disposableNew);
	context.subscriptions.push(disposableHere);
	context.subscriptions.push(disposableStop);
}


exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
