
// WMR Utilities v58 — local snapshots export
(function(){
  function download(filename, text){
    const a = document.createElement('a');
    a.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(text));
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  window.WMR = window.WMR || {};
  window.WMR.exportSnapshot = function(kind, payload){
    const stamp = new Date().toISOString().replaceAll(':','-');
    const fname = `wmr_${kind}_snapshot_${stamp}.json`;
    download(fname, JSON.stringify(payload, null, 2));
    return fname;
  }
})();
