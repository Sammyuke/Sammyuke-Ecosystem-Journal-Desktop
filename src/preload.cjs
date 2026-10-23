const {contextBridge,ipcRenderer}=require('electron');
// Expose narrow methods only; never expose IPC or Node itself to the website.
if(window.top===window&&location.origin===process.argv.find(v=>v.startsWith('--ej-origin='))?.slice(12))contextBridge.exposeInMainWorld('ecosystemDesktop',{
 platform:process.platform,
 openGoogle:(url)=>ipcRenderer.invoke('ej:google',url),
 takeAuth:()=>ipcRenderer.invoke('ej:take-auth'),
 onAuth:(listener)=>{const handler=()=>listener();ipcRenderer.on('ej:auth-ready',handler);return()=>ipcRenderer.removeListener('ej:auth-ready',handler)},
});
