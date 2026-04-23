import * as vscode from 'vscode';
import { alignTableCommand, alignAllTablesInDocument } from './table/commands/align';
import {
  insertRowAboveCommand,
  insertRowBelowCommand,
  insertColumnLeftCommand,
  insertColumnRightCommand,
  deleteRowCommand,
  deleteColumnCommand,
  moveRowUpCommand,
  moveRowDownCommand,
  moveColumnLeftCommand,
  moveColumnRightCommand
} from './table/commands/rowColumn';
import {
  nextCellCommand,
  previousCellCommand,
  nextRowCommand
} from './table/commands/navigate';
import { sortByColumnCommand } from './table/commands/sort';
import { convertSelectionToTableCommand } from './table/commands/convert';
import { pasteLinkCommand } from './insert/link';
import { pasteImageCommand } from './insert/image';
import { registerInTableContext } from './util/contextKey';

export function activate(context: vscode.ExtensionContext): void {
  const register = (command: string, handler: (...args: unknown[]) => unknown) => {
    context.subscriptions.push(vscode.commands.registerCommand(command, handler));
  };

  // Table structure
  register('markdownFoundry.alignTable',              alignTableCommand);
  register('markdownFoundry.insertRowAbove',          insertRowAboveCommand);
  register('markdownFoundry.insertRowBelow',          insertRowBelowCommand);
  register('markdownFoundry.insertColumnLeft',        insertColumnLeftCommand);
  register('markdownFoundry.insertColumnRight',       insertColumnRightCommand);
  register('markdownFoundry.deleteRow',               deleteRowCommand);
  register('markdownFoundry.deleteColumn',            deleteColumnCommand);
  register('markdownFoundry.moveRowUp',               moveRowUpCommand);
  register('markdownFoundry.moveRowDown',             moveRowDownCommand);
  register('markdownFoundry.moveColumnLeft',          moveColumnLeftCommand);
  register('markdownFoundry.moveColumnRight',         moveColumnRightCommand);
  register('markdownFoundry.sortByColumn',            sortByColumnCommand);
  register('markdownFoundry.convertSelectionToTable', convertSelectionToTableCommand);

  // Navigation
  register('markdownFoundry.nextCell',     nextCellCommand);
  register('markdownFoundry.previousCell', previousCellCommand);
  register('markdownFoundry.nextRow',      nextRowCommand);

  // Insertion
  register('markdownFoundry.pasteLink',  pasteLinkCommand);
  register('markdownFoundry.pasteImage', pasteImageCommand);

  // Context key for Tab/Shift-Tab/Enter bindings
  registerInTableContext(context);

  // Align on save (opt-in via config)
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event) => {
      if (event.document.languageId !== 'markdown') return;
      const config = vscode.workspace.getConfiguration('markdownFoundry');
      if (!config.get<boolean>('alignOnSave')) return;
      event.waitUntil(Promise.resolve(alignAllTablesInDocument(event.document)));
    })
  );
}

export function deactivate(): void {
  // nothing to clean up; all disposables are in context.subscriptions
}
