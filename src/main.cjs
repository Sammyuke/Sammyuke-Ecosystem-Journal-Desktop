const {app,BrowserWindow,Menu,session,shell,ipcMain,dialog,screen}=require('electron');
const {autoUpdater}=require('electron-updater');
const fs=require('node:fs');const path=require('node:path');
const {SITE_URL,APP_ID}=require('./config.cjs');const policy=require('./policy.cjs');
if(!app.isPackaged&&process.env.EJ_SMOKE_DATA)app.setPath('userData',process.env.EJ_SMOKE_DATA);
let main,queuedAuth=null,updateTimer,quitting=false;const windows=new Set();
const stateFile=()=>path.join(app.getPath('userData'),'window.json');
const authFile=()=>path.join(app.getPath('userData'),'pending-auth.json');
function read(file){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return {}}}
function pending(){const at=read(authFile()).at;return typeof at==='number'&&Date.now()-at<10*60*1000&&Date.now()>=at}
function clearPending(){try{fs.unlinkSync(authFile())}catch{}}
function focus(){if(main){if(main.isMinimized())main.restore();main.show();main.focus()}}
function receive(value){const result=policy.callback(value);if(!result||!pending())return;clearPending();queuedAuth=result;focus();if(main&&policy.own(main.webContents.getURL()))main.webContents.send('ej:auth-ready')}
function openExternal(url){if(policy.external(url))shell.openExternal(url).catch(()=>{})}
function safeSender(event){return main&&!main.isDestroyed()&&event.sender===main.webContents&&event.senderFrame===main.webContents.mainFrame&&policy.own(event.senderFrame.url)}
function saveWindow(){if(!main||main.isDestroyed())return;try{fs.writeFileSync(stateFile(),JSON.stringify({...main.getNormalBounds(),maximized:main.isMaximized()}))}catch{}}
function options(){return {contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,additionalArguments:['--ej-origin='+new URL(SITE_URL).origin],preload:path.join(__dirname,'preload.cjs')}}
function secure(contents){
 contents.on('will-attach-webview',event=>event.preventDefault());
 contents.on('will-navigate',(event,url)=>{if(policy.inside(url))return;event.preventDefault();openExternal(url)});
 contents.on('will-redirect',(event,url)=>{if(policy.inside(url))return;event.preventDefault();openExternal(url)});
 contents.setWindowOpenHandler(({url})=>{if(!policy.inside(url)&&!((url==='about:blank'||url==='')&&policy.inside(contents.getURL()))){openExternal(url);return {action:'deny'}}return {action:'allow',overrideBrowserWindowOptions:{width:620,height:760,minWidth:400,minHeight:500,backgroundColor:'#0A0A0A',autoHideMenuBar:true,webPreferences:options()}}});
 contents.on('did-create-window',win=>{windows.add(win);win.setMenuBarVisibility(false);win.on('closed',()=>windows.delete(win))});
}
const offline=()=>`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><title>Ecosystem Journal</title><style>body{margin:0;background:#0A0A0A;color:#ddd;font:15px/1.6 system-ui;display:grid;place-items:center;min-height:100vh}main{max-width:440px;padding:32px}small{color:#9db9a8}h1{font-size:25px}p{color:#999}a{display:inline-block;padding:9px 18px;border:1px solid #365640;background:#173024;border-radius:6px;color:#c8e4d1;text-decoration:none}</style></head><body><main><small>ECOSYSTEM JOURNAL</small><h1>Can't reach Ecosystem Journal</h1><p>Check your connection and try again. Your journal will be here when the connection returns.</p><a href="${SITE_URL}">Retry</a></main></body></html>`)}`;
function showOffline(){if(main&&!main.isDestroyed())void main.loadURL(offline()).catch(()=>{})}
function create(){
 const saved=read(stateFile());const width=Number.isFinite(saved.width)?Math.max(1000,Math.min(saved.width,4000)):1280,height=Number.isFinite(saved.height)?Math.max(650,Math.min(saved.height,2400)):800;
 const visible=Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&screen.getAllDisplays().some(d=>saved.x<d.workArea.x+d.workArea.width-100&&saved.x+width>d.workArea.x+100&&saved.y>=d.workArea.y&&saved.y<d.workArea.y+d.workArea.height-80);
 main=new BrowserWindow({width,height,minWidth:1000,minHeight:650,...(visible?{x:saved.x,y:saved.y}:{}),backgroundColor:'#0A0A0A',icon:path.join(__dirname,'../assets/icon.png'),autoHideMenuBar:true,show:false,...(process.platform==='darwin'?{titleBarStyle:'hiddenInset',vibrancy:'header',visualEffectState:'followWindow',trafficLightPosition:{x:16,y:16}}:{}),webPreferences:options()});
 windows.add(main);main.setMenuBarVisibility(false);main.once('ready-to-show',()=>{main.show();if(saved.maximized)main.maximize()});main.on('close',saveWindow);main.on('closed',()=>{windows.delete(main);main=null});
 main.webContents.on('did-fail-load',(_e,code,_description,url,isMain)=>{if(isMain&&code!==-3&&policy.inside(url))showOffline()});
 main.webContents.on('render-process-gone',showOffline);
 main.webContents.on('did-finish-load',()=>{if(queuedAuth&&policy.own(main.webContents.getURL()))main.webContents.send('ej:auth-ready')});
 // Netlify error responses can finish loading successfully. Replace 5xx pages too.
 session.defaultSession.webRequest.onCompleted({urls:[SITE_URL+'/*']},details=>{if(details.resourceType==='mainFrame'&&details.webContentsId===main?.webContents.id&&details.statusCode>=500)showOffline()});
 void main.loadURL(SITE_URL).catch(showOffline);
}
if(!app.requestSingleInstanceLock())app.quit();else{
 app.on('second-instance',(_event,argv)=>{for(const arg of argv)if(arg.startsWith('ecosystemjournal://'))receive(arg);focus()});
 app.on('open-url',(event,url)=>{event.preventDefault();receive(url)});
 app.on('web-contents-created',(_e,contents)=>secure(contents));
 app.whenReady().then(()=>{
  app.setAppUserModelId(APP_ID);Menu.setApplicationMenu(null);
  if(!process.env.EJ_SMOKE_DATA&&process.defaultApp){if(process.argv[1])app.setAsDefaultProtocolClient('ecosystemjournal',process.execPath,[path.resolve(process.argv[1])])}else if(!process.env.EJ_SMOKE_DATA)app.setAsDefaultProtocolClient('ecosystemjournal');
  session.defaultSession.setPermissionRequestHandler((wc,permission,cb,details)=>cb(policy.microphone(permission,details.requestingUrl||wc.getURL(),details.mediaTypes)&&details.isMainFrame!==false));
  session.defaultSession.setPermissionCheckHandler((_wc,permission,origin,details)=>permission==='media'&&policy.own(origin)&&details.mediaType==='audio');
  session.defaultSession.setDevicePermissionHandler(()=>false);
  session.defaultSession.on('will-download',(event,item)=>{event.preventDefault();openExternal(item.getURL())});
  ipcMain.handle('ej:google',async(event,url)=>{if(!safeSender(event)||typeof url!=='string'||!policy.oauth(url))throw Error('Invalid sign-in request');fs.writeFileSync(authFile(),JSON.stringify({at:Date.now()}));await shell.openExternal(url)});
  ipcMain.handle('ej:take-auth',event=>{if(!safeSender(event))return null;const result=queuedAuth;queuedAuth=null;return result});
  create();for(const arg of process.argv)if(arg.startsWith('ecosystemjournal://'))receive(arg);
  if(app.isPackaged){autoUpdater.autoDownload=true;autoUpdater.autoInstallOnAppQuit=false;autoUpdater.on('error',()=>{});autoUpdater.on('update-downloaded',async()=>{const {response}=await dialog.showMessageBox(main||undefined,{type:'info',title:'Update ready',message:'Restart to update',detail:'A new version of Ecosystem Journal is ready. Save any unfinished work first.',buttons:['Later','Restart to update'],defaultId:0,cancelId:0});if(response===1){quitting=true;autoUpdater.quitAndInstall(false,true)}});const check=()=>autoUpdater.checkForUpdates().catch(()=>{});void check();updateTimer=setInterval(check,4*60*60*1000)}
 });
 app.on('activate',()=>{if(!main)create();else focus()});
 app.on('window-all-closed',()=>{if(process.platform!=='darwin'||quitting)app.quit()});app.on('before-quit',()=>{quitting=true;clearInterval(updateTimer);saveWindow()});
}
