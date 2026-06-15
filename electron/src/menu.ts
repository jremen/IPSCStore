import { app, Menu, BrowserWindow, ipcMain, dialog } from 'electron';

export interface MenuState {
  activeTab?: 'matches' | 'stages' | 'shooters' | 'registration' | 'scoring' | 'results';
  activeMatchId?: string | null;
  activeStageId?: string | null;
  hasMatches?: boolean;
  hasStages?: boolean;
  hasRegistrations?: boolean;
  language?: 'en' | 'sk';
}

let currentState: MenuState = {};
let mainWindow: BrowserWindow | null = null;

function send(action: string, payload?: any) {
  mainWindow?.webContents?.send('menu-action', action, payload);
}

function buildMenuTemplate(): Electron.MenuItemConstructorOptions[] {
  const isMac = process.platform === 'darwin';
  const hasMatch = !!currentState.activeMatchId;
  const hasStage = !!currentState.activeStageId;

  const fileMenu: Electron.MenuItemConstructorOptions = {
    label: 'File',
    submenu: [
      {
        label: 'Import WinMSS…',
        accelerator: 'CmdOrCtrl+Shift+M',
        click: () => send('winmss-import'),
      },
      { type: 'separator' },
      {
        label: 'Export Database Backup (.sql)',
        accelerator: 'CmdOrCtrl+Shift+E',
        click: () => send('export-database-backup'),
      },
      {
        label: 'Import Database Backup (.sql)',
        accelerator: 'CmdOrCtrl+Shift+O',
        click: () => send('import-database-backup'),
      },
      { type: 'separator' },
      {
        label: 'Preferences…',
        accelerator: isMac ? 'Cmd+,' : 'Ctrl+Shift+P',
        click: () => send('open-preferences'),
      },
      {
        label: 'Language',
        submenu: [
          {
            label: 'English',
            type: 'checkbox',
            checked: currentState.language === 'en' || !currentState.language,
            click: () => send('set-language', 'en'),
          },
          {
            label: 'Slovenčina',
            type: 'checkbox',
            checked: currentState.language === 'sk',
            click: () => send('set-language', 'sk'),
          },
        ],
      },
      { type: 'separator' },
      isMac ? { label: 'Close', role: 'close' } : { label: 'Quit', role: 'quit', accelerator: 'Alt+F4' },
    ],
  };

  const editMenu: Electron.MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { label: 'Undo', role: 'undo' },
      { label: 'Redo', role: 'redo' },
      { type: 'separator' },
      { label: 'Cut', role: 'cut' },
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste' },
      { label: 'Select All', role: 'selectAll' },
      { type: 'separator' },
      {
        label: 'Find',
        accelerator: 'CmdOrCtrl+F',
        click: () => send('focus-search'),
      },
    ],
  };

  const matchesMenu: Electron.MenuItemConstructorOptions = {
    label: 'Matches',
    submenu: [
      {
        label: 'New Match',
        accelerator: 'CmdOrCtrl+Shift+N',
        click: () => send('new-match'),
      },
      {
        label: 'Import WinMSS…',
        click: () => send('winmss-import'),
      },
      {
        label: 'Delete All Matches',
        enabled: !!currentState.hasMatches,
        click: () => send('delete-all-matches'),
      },
    ],
  };

  const stagesMenu: Electron.MenuItemConstructorOptions = {
    label: 'Stages',
    enabled: hasMatch,
    submenu: [
      {
        label: 'Add Stage',
        accelerator: 'CmdOrCtrl+Shift+A',
        click: () => send('new-stage'),
      },
      {
        label: 'Print Score Sheets',
        enabled: !!currentState.hasStages,
        click: () => send('print-score-sheets'),
      },
    ],
  };

  const shootersMenu: Electron.MenuItemConstructorOptions = {
    label: 'Shooters',
    submenu: [
      {
        label: 'New Shooter',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => send('new-shooter'),
      },
      {
        label: 'Import Shooters from CSV',
        click: () => send('import-shooters-csv'),
      },
      {
        label: 'Toggle Show Deleted',
        click: () => send('toggle-show-deleted'),
      },
    ],
  };

  const registrationMenu: Electron.MenuItemConstructorOptions = {
    label: 'Registration',
    enabled: hasMatch,
    submenu: [
      {
        label: 'Add Existing Shooter',
        click: () => send('add-registration'),
      },
      {
        label: 'Create & Register New Shooter',
        click: () => send('new-registration-shooter'),
      },
      {
        label: 'Import Registrations from CSV',
        click: () => send('import-registrations-csv'),
      },
    ],
  };

  const scoringMenu: Electron.MenuItemConstructorOptions = {
    label: 'Scoring',
    enabled: hasMatch && hasStage,
    submenu: [
      {
        label: 'Previous Shooter',
        accelerator: 'CmdOrCtrl+Shift+Left',
        click: () => send('prev-shooter'),
      },
      {
        label: 'Next Shooter',
        accelerator: 'CmdOrCtrl+Shift+Right',
        click: () => send('next-shooter'),
      },
      { type: 'separator' },
      {
        label: 'Confirm Save',
        accelerator: 'CmdOrCtrl+Enter',
        click: () => send('confirm-score'),
      },
    ],
  };

  const resultsMenu: Electron.MenuItemConstructorOptions = {
    label: 'Results',
    enabled: hasMatch,
    submenu: [
      {
        label: 'Print',
        accelerator: 'CmdOrCtrl+P',
        click: () => send('print-results'),
      },
      { type: 'separator' },
      {
        label: 'Export PDF',
        click: () => send('export-results-pdf'),
      },
      {
        label: 'Export CSV',
        click: () => send('export-results-csv'),
      },
      {
        label: 'Export HTML',
        click: () => send('export-results-html'),
      },
    ],
  };

  const viewMenu: Electron.MenuItemConstructorOptions = {
    label: 'View',
    submenu: [
      { label: 'Reload', role: 'reload', accelerator: 'CmdOrCtrl+R' },
      { type: 'separator' },
      {
        label: 'Toggle Dark Mode',
        accelerator: 'CmdOrCtrl+Shift+D',
        click: () => send('toggle-theme'),
      },
      {
        label: 'Toggle Developer Tools',
        click: () => mainWindow?.webContents?.toggleDevTools(),
        accelerator: 'CmdOrCtrl+Shift+I',
      },
    ],
  };

  const windowMenu: Electron.MenuItemConstructorOptions = {
    label: 'Window',
    submenu: [
      { label: 'Minimize', role: 'minimize' },
      { label: 'Zoom', role: 'zoom' },
      { type: 'separator' },
      { label: 'Close', role: 'close' },
      { type: 'separator' },
      { label: 'Bring All to Front', role: 'front' },
    ],
  };

  const helpMenu: Electron.MenuItemConstructorOptions = {
    label: 'Help',
    submenu: [
      {
        label: 'Toggle Developer Tools',
        click: () => mainWindow?.webContents?.toggleDevTools(),
      },
      {
        label: 'About IPSC Score',
        click: () => {
          dialog.showMessageBox(mainWindow!, {
            type: 'info',
            title: 'About IPSC Score',
            message: 'IPSC Score',
            detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}`,
            buttons: ['OK'],
          });
        },
      },
    ],
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    fileMenu,
    editMenu,
    matchesMenu,
    stagesMenu,
    shootersMenu,
    registrationMenu,
    scoringMenu,
    resultsMenu,
    viewMenu,
  ];

  if (isMac) {
    template.unshift({
      label: app.name,
      submenu: [
        { label: 'About IPSC Score', click: () => {
          dialog.showMessageBox(mainWindow!, {
            type: 'info',
            title: 'About IPSC Score',
            message: 'IPSC Score',
            detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}`,
            buttons: ['OK'],
          });
        } },
        { type: 'separator' },
        { label: 'Preferences…', accelerator: 'Cmd+,', click: () => send('open-preferences') },
        { type: 'separator' },
        { label: 'Hide IPSC Score', role: 'hide' },
        { label: 'Hide Others', role: 'hideOthers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit IPSC Score', role: 'quit', accelerator: 'Cmd+Q' },
      ],
    });
    template.push(windowMenu);
  }

  template.push(helpMenu);

  return template;
}

export function setMainWindow(window: BrowserWindow | null) {
  mainWindow = window;
}

export function buildMenu() {
  const template = buildMenuTemplate();
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

export function updateMenuState(state: MenuState) {
  currentState = { ...currentState, ...state };
  buildMenu();
}

export function setupMenuIpc() {
  ipcMain.on('set-menu-state', (_event, state: MenuState) => {
    updateMenuState(state);
  });
}
