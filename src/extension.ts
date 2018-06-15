'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

function directoryDistance(a: string, b:string): number {
    const relativePath = path.relative(path.dirname(a), path.dirname(b));
    const elements = relativePath.split('/');

    return elements[0] === '.' ? elements.length - 1 : elements.length;
}

class FileMatch {
    path: string;
    correspondingFile?: FileMatch;
    private _isTest: boolean | null;

    constructor(path: string) {
        this.path = path;
        this._isTest = null;
    }

    get isTest() : boolean {
        if (this._isTest === null) {
            this._isTest = /\.(spec|test)\.js$/.test(this.path)
                        || /\/(__tests__|test)\/[^/]+\.js$/.test(this.path);
        }
        return this._isTest;
    }

    findCorrespondingFile(allFiles: vscode.Uri[]) {
        const fileMatches = allFiles.map((file: vscode.Uri) : FileMatch => FileMatch.create(file.path));

        console.log('finding best match for', this.path);
        const bestMatch = fileMatches.reduce((bestCandidate: FileMatch | null, candidate) => {
            console.log('comparing', this.path, candidate.path);
            if (this.path === candidate.path) { return bestCandidate; }

            if (bestCandidate === null) { return candidate; }

            if ((this.isTest && candidate.isTest) || (!this.isTest && !candidate.isTest)) {
                return bestCandidate;
            }

            if (bestCandidate !== null) {
                const bestCandidateDistance = directoryDistance(this.path, bestCandidate.path);
                const candidateDistance = directoryDistance(this.path, candidate.path);

                if (bestCandidateDistance < candidateDistance) {
                    return bestCandidate;
                }
            }

            return candidate;
        }, null);

        if (bestMatch) {
            this.correspondingFile = bestMatch;
        }
    }
    
    static create(path: string) {
        return new this(path);
    }
}

export async function findFile(activeFile: vscode.Uri) : Promise<vscode.Uri> {
    const ext = path.extname(activeFile.fsPath);
    const basename = path.basename(activeFile.fsPath);
    const name = basename.replace('.spec' + ext, '').replace('.test' + ext, '').replace(ext, '');

    const allFilesMatching = await vscode.workspace.findFiles(`**/${name}{.js,.spec.js,.test.js}`);
    const file = allFilesMatching.find(x => x.path === activeFile.fsPath);

    if (!file) {
        throw new Error('File not found.');
    }

    const fileMatch = FileMatch.create(file.path);

    fileMatch.findCorrespondingFile(allFilesMatching);

    if (!fileMatch.correspondingFile) {
        throw new Error('No matches');
    }

    return vscode.Uri.file(fileMatch.correspondingFile.path);
}

export function findOtherColumn(activeViewColumn?: vscode.ViewColumn) {
    if (!activeViewColumn || activeViewColumn === vscode.ViewColumn.Two) {
        return vscode.ViewColumn.One;
    }
    return vscode.ViewColumn.Two;
}

export async function openTestFile(openToTheSide: boolean = false) {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return false;
    }

    const editorUri = editor.document.uri;

    try {
        const filePath = await findFile(editorUri);

        const showTextDocumentOptions: vscode.TextDocumentShowOptions = {};

        if (openToTheSide) {
            showTextDocumentOptions.viewColumn = findOtherColumn(editor.viewColumn);
        }
        
        await vscode.window.showTextDocument(filePath, showTextDocumentOptions);
    } catch (e) {
        if (e.message === 'No matches') {
            vscode.window.showInformationMessage('No corresponding test file found.');
        }
        console.error(e);
        return false;
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    const peekTestFileSubscription = vscode.commands.registerCommand('extension.peekTestFile', () => openTestFile());
    context.subscriptions.push(peekTestFileSubscription);

    const peekTestFileToTheSideSubscription = vscode.commands.registerCommand('extension.peekTestFileToTheSide', () => openTestFile(true));
    context.subscriptions.push(peekTestFileToTheSideSubscription);
}

// this method is called when your extension is deactivated
export function deactivate() {
}