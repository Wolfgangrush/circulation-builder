const { app, BrowserWindow, Menu, session, shell } = require("electron");
const path = require("node:path");

const APP_TITLE = "Circulation Builder for Bombay High Court";
const allowedExternalOrigin = "https://bombayhighcourt.gov.in/";

function isBundledPage(url) {
  return url.startsWith("file:");
}

function openExternalOnly(url) {
  if (url.startsWith(allowedExternalOrigin)) {
    void shell.openExternal(url);
  }
}

function openPrivacyPolicy() {
  const focused = BrowserWindow.getFocusedWindow();
  const target = focused || BrowserWindow.getAllWindows()[0];
  const dispatchScript = 'window.dispatchEvent(new Event("cb:open-privacy"))';

  if (target) {
    if (target.isMinimized()) target.restore();
    target.focus();
    target.webContents.executeJavaScript(dispatchScript);
  } else {
    const win = createWindow();
    win.webContents.once("did-finish-load", () => {
      win.webContents.executeJavaScript(dispatchScript);
    });
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 980,
    minHeight: 700,
    title: APP_TITLE,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalOnly(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!isBundledPage(url)) {
      event.preventDefault();
      openExternalOnly(url);
    }
  });
  void window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  return window;
}

const isMac = process.platform === "darwin";

const menuTemplate = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            {
              id: "privacy-policy",
              label: "Privacy Policy…",
              click: openPrivacyPolicy
            },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" }
          ]
        }
      ]
    : []),
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" }
    ]
  },
  {
    label: "View",
    submenu: [
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" }
    ]
  },
  {
    role: "windowMenu"
  },
  {
    role: "help",
    submenu: [
      {
        ...(isMac ? {} : { id: "privacy-policy" }),
        label: "Privacy Policy",
        click: openPrivacyPolicy
      }
    ]
  }
];

app.whenReady().then(() => {
  app.setAboutPanelOptions({
    applicationName: APP_TITLE,
    applicationVersion: app.getVersion(),
    version: "",
    copyright: "Copyright © 2026 wolfgang_rush & Rushikesh R. Mahajan",
    credits: "Independent tool. Not an official application of the Bombay High Court, and not affiliated with or endorsed by the High Court or its Registry."
  });

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const allowed = details.url.startsWith("file:") || details.url.startsWith("devtools:");
    callback({ cancel: !allowed });
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
