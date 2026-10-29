// Enhance only genuine two-image galleries. Vertical scroll and pinch zoom stay native.
export function bindCardSwipe(gallery,product,{now=()=>performance.now()}={}){
  if(product.gallery.length!==2||gallery.dataset.swipeReady)return false;
  const primary=gallery.querySelector('.sr-card-image');
  const pagination=gallery.querySelector('.sr-card-pagination');
  if(!primary||!pagination)return false;
  const dots=[...pagination.querySelectorAll('button')];
  let index=0,gesture=null,suppressUntil=0;
  function select(next,touch=false){
    index=Math.max(0,Math.min(1,next));
    gallery.dataset.cardView=String(index);
    if(touch)gallery.classList.add('sr-card-touch');
    primary.alt=product.gallery[index].alt;
    dots.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  }
  gallery.dataset.swipeReady='true';
  gallery.classList.add('sr-swipe-ready');
  pagination.hidden=false;
  select(0);
  dots.forEach((button,i)=>button.addEventListener('click',()=>select(i,true)));
  gallery.addEventListener('pointerenter',event=>{
    if(event.pointerType==='mouse'){gallery.classList.remove('sr-card-touch');select(0);}
  },{passive:true});
  gallery.addEventListener('pointerdown',event=>{
    suppressUntil=0;
    if(event.pointerType==='mouse'){
      gallery.classList.remove('sr-card-touch');select(0);gesture=null;return;
    }
    if(event.isPrimary===false){gesture=null;return;}
    if(!['touch','pen'].includes(event.pointerType)||event.target.closest('.sr-card-pagination'))return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
    gallery.classList.add('sr-card-touch');
  },{passive:true});
  gallery.addEventListener('pointermove',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const dx=Math.abs(event.clientX-gesture.x),dy=Math.abs(event.clientY-gesture.y);
    // A gesture that begins vertically belongs to the page, even if it later curves.
    if(dy>10&&dy>=dx)gesture=null;
  },{passive:true});
  gallery.addEventListener('pointerup',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;
    if(Math.abs(dx)<12||Math.abs(dx)<=Math.abs(dy)*1.25)return;
    // Swiping (including a small drag or a swipe at the end) must not open details.
    suppressUntil=now()+600;
    if(Math.abs(dx)>=40)select(index+(dx<0?1:-1),true);
  },{passive:true});
  gallery.addEventListener('pointercancel',()=>{gesture=null;},{passive:true});
  gallery.addEventListener('click',event=>{
    // Keep keyboard activation working; a new intentional pointerdown also clears this guard.
    if(now()<suppressUntil&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();}
  },{capture:true});
  return true;
}
