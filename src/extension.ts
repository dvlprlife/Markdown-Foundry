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
import { insertTableCommand } from './insert/insertTable';
import { upsertTOCCommand } from './structure/commands/toc';
import { pasteLinkCommand } from './insert/link';
import { pasteImageCommand } from './insert/image';
import {
  toggleBoldCommand,
  toggleItalicCommand,
  toggleBoldItalicCommand,
  toggleStrikethroughCommand,
  toggleBlockquoteCommand,
  toggleBlockCodeCommand,
  toggleBulletListCommand,
  toggleNumberedListCommand,
  toggleInlineCodeCommand,
  toggleHeading1Command,
  toggleHeading2Command,
  toggleHeading3Command,
  toggleHeading4Command,
  toggleHeading5Command,
  toggleHeading6Command,
  promoteHeadingCommand,
  demoteHeadingCommand,
  toggleTaskListCommand,
  insertHorizontalRuleCommand
} from './format/commands';
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
  register('markdownFoundry.insertTable',             insertTableCommand);

  // Navigation
  register('markdownFoundry.nextCell',     nextCellCommand);
  register('markdownFoundry.previousCell', previousCellCommand);
  register('markdownFoundry.nextRow',      nextRowCommand);

  // Insertion
  register('markdownFoundry.pasteLink',  pasteLinkCommand);
  register('markdownFoundry.pasteImage', pasteImageCommand);

  // Formatting toggles
  register('markdownFoundry.toggleBold',          toggleBoldCommand);
  register('markdownFoundry.toggleItalic',        toggleItalicCommand);
  register('markdownFoundry.toggleBoldItalic',    toggleBoldItalicCommand);
  register('markdownFoundry.toggleStrikethrough', toggleStrikethroughCommand);
  register('markdownFoundry.toggleBlockquote',    toggleBlockquoteCommand);
  register('markdownFoundry.toggleBlockCode',     toggleBlockCodeCommand);
  register('markdownFoundry.toggleBulletList',    toggleBulletListCommand);
  register('markdownFoundry.toggleNumberedList',  toggleNumberedListCommand);
  register('markdownFoundry.toggleInlineCode',    toggleInlineCodeCommand);
  register('markdownFoundry.toggleHeading1',      toggleHeading1Command);
  register('markdownFoundry.toggleHeading2',      toggleHeading2Command);
  register('markdownFoundry.toggleHeading3',      toggleHeading3Command);
  register('markdownFoundry.toggleHeading4',      toggleHeading4Command);
  register('markdownFoundry.toggleHeading5',      toggleHeading5Command);
  register('markdownFoundry.toggleHeading6',      toggleHeading6Command);
  register('markdownFoundry.promoteHeading',      promoteHeadingCommand);
  register('markdownFoundry.demoteHeading',       demoteHeadingCommand);
  register('markdownFoundry.toggleTaskList',      toggleTaskListCommand);
  register('markdownFoundry.insertHorizontalRule', insertHorizontalRuleCommand);

  // Structure
  register('markdownFoundry.toc', upsertTOCCommand);

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
