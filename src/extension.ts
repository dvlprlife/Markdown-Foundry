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
  register('markdownForge.alignTable',              alignTableCommand);
  register('markdownForge.insertRowAbove',          insertRowAboveCommand);
  register('markdownForge.insertRowBelow',          insertRowBelowCommand);
  register('markdownForge.insertColumnLeft',        insertColumnLeftCommand);
  register('markdownForge.insertColumnRight',       insertColumnRightCommand);
  register('markdownForge.deleteRow',               deleteRowCommand);
  register('markdownForge.deleteColumn',            deleteColumnCommand);
  register('markdownForge.moveRowUp',               moveRowUpCommand);
  register('markdownForge.moveRowDown',             moveRowDownCommand);
  register('markdownForge.moveColumnLeft',          moveColumnLeftCommand);
  register('markdownForge.moveColumnRight',         moveColumnRightCommand);
  register('markdownForge.sortByColumn',            sortByColumnCommand);
  register('markdownForge.convertSelectionToTable', convertSelectionToTableCommand);

  // Navigation
  register('markdownForge.nextCell',     nextCellCommand);
  register('markdownForge.previousCell', previousCellCommand);
  register('markdownForge.nextRow',      nextRowCommand);

  // Insertion
  register('markdownForge.pasteLink',  pasteLinkCommand);
  register('markdownForge.pasteImage', pasteImageCommand);

  // Context key for Tab/Shift-Tab/Enter bindings
  registerInTableContext(context);

  // Align on save (opt-in via config)
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event) => {
      if (event.document.languageId !== 'markdown') return;
      const config = vscode.workspace.getConfiguration('markdownForge');
      if (!config.get<boolean>('alignOnSave')) return;
      event.waitUntil(Promise.resolve(alignAllTablesInDocument(event.document)));
    })
  );
}

export function deactivate(): void {
  // nothing to clean up; all disposables are in context.subscriptions
}
