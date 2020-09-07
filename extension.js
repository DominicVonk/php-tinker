// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const cp = require('child_process');
const fs = require('fs');

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
		obj.child.kill('SIGKILL');
	}
	if (obj.hadPanel && !obj.panel) {
		createPanel(obj)
	}
	obj.running = setTimeout(function () {
		fs.writeFileSync('/tmp/tinker', obj.document.getText());
		obj.child = cp.exec('cd "' + vscode.workspace.workspaceFolders[0].uri.fsPath + '" && VAR_DUMPER_FORMAT=html php artisan tinker /tmp/tinker', (err, stdout, stderr) => {
			if (stdout) {
				obj.panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>PHP Tinker</title>
</head>
<body>${stdout}<style>html,body {background:#18171B;} * {outline: 0}</style></body></html>`;
			}
			fs.unlinkSync('/tmp/tinker');
		});
	}, 1000);
}
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let obj = {
		context,
		document: null,
		hadPanel: false
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
		context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((changeText) => {
			if (changeText.textEditor.document === obj.document) {
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
