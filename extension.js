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

		let child = spawn('php', ['artisan', 'tinker'], {
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
		document: null,
		hadPanel: false,
		terminal: null,
		terminalEvent: null
	};
	let disposable = vscode.commands.registerCommand('php-tinker.tinkerThis', async function () {
		// The code you place here will be executed every time your command is executed

		if (!obj.document) {
			obj.document = await vscode.workspace.openTextDocument({ language: 'php', content: '<?php\n' });
		}
		await vscode.window.showTextDocument(obj.document, { preview: false });

		if (!obj.panel) {
			createPanel(obj);
		}
		if (obj.document.getText() !== '<?php\n') {
			runner(obj);
		}
		context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((textEditor) => {
			if (textEditor.document === obj.document) {
				if (obj.panel) {
					runner(obj);
					obj.hadPanel = true;
				}
			} else {
				if (obj.panel) {
					obj.panel.dispose();
					obj.hadPanel = true;
				}
			}
		}));
		context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(textDoc => {
			if (textDoc === obj.document) {
				obj.panel.dispose();
				obj.document = null;
			}
		}));
		let text = obj.document.getText();
		context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((changeText) => {
			if (changeText.textEditor.document === obj.document && text !== changeText.textEditor.document.getText()) {
				text = changeText.textEditor.document.getText()
				runner(obj);
			}
		}))
	});

	context.subscriptions.push(disposable);
}


exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
