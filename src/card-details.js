// Demo-only inputs: no real credentials are collected or persisted.
export function createDemoCardDetails(onChange = () => {}) {
  const row = document.createElement('div');
  row.className = 'card-details-row';
  row.innerHTML = '<label>Срок действия<input data-expiry aria-label="Срок действия" placeholder="ММ/ГГ" readonly autocomplete="off" aria-haspopup="dialog"></label><label>CVC/CVV<input data-cvc aria-label="CVC/CVV" type="password" placeholder="3 цифры" readonly autocomplete="off"></label>';
  const expiry=row.querySelector('[data-expiry]');
  const cvc=row.querySelector('[data-cvc]');
  const fill = () => {
    if(!expiry.value) expiry.value = '12/30';
    if(!cvc.value) cvc.value = '123';
    onChange();
  };
  row.addEventListener('pointerenter', fill);
  row.addEventListener('pointerdown', fill);
  row.addEventListener('focusin', fill);
  const picker=document.createElement('dialog');
  picker.className='expiry-picker';
  picker.setAttribute('aria-label','Срок действия карты');
  picker.innerHTML='<h2>Срок действия</h2><div class="expiry-wheel-labels"><span>Месяц</span><span>Год</span></div><div class="expiry-wheels"><div class="expiry-wheel" role="listbox" aria-label="Месяц" tabindex="0"></div><div class="expiry-wheel" role="listbox" aria-label="Год" tabindex="0"></div></div><p class="expiry-picker-error" role="status"></p><button type="button" class="expiry-confirm">Готово</button><button type="button" class="expiry-cancel">Отмена</button>';
  row.append(picker);
  const now=new Date();
  const currentYear=now.getFullYear();
  const values=[Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')),Array.from({length:21},(_,i)=>String(currentYear+i))];
  const wheels=[...picker.querySelectorAll('.expiry-wheel')];
  const selected=[0,0];
  const confirm=picker.querySelector('.expiry-confirm');
  const sync=()=>{
    wheels.forEach((wheel,column)=>{
      selected[column]=Math.max(0,Math.min(values[column].length-1,Math.round(wheel.scrollTop/44)));
      [...wheel.children].forEach((option,index)=>option.setAttribute('aria-selected',String(index===selected[column])));
      wheel.setAttribute('aria-activedescendant',wheel.children[selected[column]].id);
    });
    const expired=Number(values[1][selected[1]])===currentYear&&selected[0]<now.getMonth();
    confirm.disabled=expired;
    picker.querySelector('.expiry-picker-error').textContent=expired?'Выберите действующий срок карты':'';
  };
  const choose=(column,index)=>{
    const wheel=wheels[column];
    wheel.scrollTo({top:Math.max(0,Math.min(values[column].length-1,index))*44,behavior:'instant'});
    sync();
  };
  const uid='expiry-'+crypto.randomUUID();
  wheels.forEach((wheel,column)=>{
    wheel.innerHTML=values[column].map((value,index)=>`<div role="option" id="${uid}-${column}-${index}" aria-selected="false">${value}</div>`).join('');
    wheel.addEventListener('scroll',sync,{passive:true});
    wheel.onclick=event=>{const index=[...wheel.children].indexOf(event.target);if(index>=0)choose(column,index);};
    wheel.onkeydown=event=>{
      const delta={ArrowDown:1,ArrowUp:-1,PageDown:3,PageUp:-3}[event.key];
      if(delta!==undefined){event.preventDefault();choose(column,selected[column]+delta);}
      if(event.key==='Home'||event.key==='End'){event.preventDefault();choose(column,event.key==='Home'?0:values[column].length-1);}
    };
  });
  const open=()=>{
    if(picker.open)return;
    const [month,year]=expiry.value.split('/');
    picker.showModal();
    choose(0,Math.max(0,values[0].indexOf(month)));
    choose(1,Math.max(0,values[1].findIndex(value=>value.slice(-2)===year)));
    wheels[0].focus();
  };
  expiry.onclick=open;
  expiry.onkeydown=event=>{if(['Enter',' ','ArrowDown'].includes(event.key)){event.preventDefault();open();}};
  confirm.onclick=()=>{
    sync();if(confirm.disabled)return;
    expiry.value=values[0][selected[0]]+'/'+values[1][selected[1]].slice(-2);
    picker.close();onChange();expiry.focus();
  };
  picker.querySelector('.expiry-cancel').onclick=()=>{picker.close();expiry.focus();};
  row.demoComplete = () => !!expiry.value && !!cvc.value;
  row.clearDemo = () => {expiry.value='';cvc.value='';};
  return row;
}
