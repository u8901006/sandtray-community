                                                                     
                                    
export type HelpRole='local'|'client'|'therapist';
export type HelpCard={title:string;lines:string[]};

export function helpCards(role:HelpRole,narrow:boolean):HelpCard[]{
 const shelf=narrow?'按畫面下方的「物件架」，':'在左邊物件架';
 const pick:HelpCard=role==='therapist'
  ?{title:'選物件與放置',lines:['物件由案主挑選和放進沙盤。','你可以在右側「沙盤裡的物件」看到每一件。']}
  :{title:'選物件與放置',lines:[shelf+'點一件物件，再點沙盤上想放的位置。','也可以按「放在中央」，或按「取消」不放。',...(narrow?[]:['用滑鼠時，也能直接把物件拖進沙盤。'])]};
 const move:HelpCard={title:'移動物件與轉視角',lines:[
  '點沙盤裡的物件，旁邊會出現轉向、縮放、拿走的按鈕；按住物件拖曳可以移動。',
  '拖曳空白處轉動視角，雙指可以拉近拉遠；下方按鈕可以換視角或重置。',
  (narrow?'在「物件細節」':'在右側')+'「沙盤裡的物件」按眼睛圖示，鏡頭會轉去對準那一件。這只改你自己的畫面。',
 ]};
 const consent:HelpCard=role==='therapist'
  ?{title:'同意與收回操作',lines:['要移動或縮放案主的物件，先選中它，再按上方「請求操作選中物件」。','案主同意後才能操作，案主隨時可以收回。']}
  :role==='client'
  ?{title:'同意與收回操作',lines:['治療師想動你的物件時，畫面上方會出現請求。','你可以按「同意上述動作」或「拒絕」；同意之後，隨時可以按「收回全部操作」。']}
  :{title:'同意與收回操作',lines:['雙人會談時，治療師要動案主的物件，必須先送出請求。','案主同意後治療師才能操作，案主隨時可以收回。']};
 return [pick,move,consent];
}
