(function(){
  try{
    const body = document.body;
    const id = body.getAttribute('data-room-id') || '';
    const m = id.match(/room(\d+)/);
    if(m){
      const num = parseInt(m[1],10);
      if(!Number.isNaN(num) && num>0){
        localStorage.setItem('hr_room_index', String(num-1));
      }
    }
  }catch(e){}
})();
