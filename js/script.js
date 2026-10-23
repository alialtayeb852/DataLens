(() => {
'use strict';

const K={
  users:'dl_users_v3',
  session:'dl_session_v3',
  datasets:'dl_datasets_v3',
  active:'dl_active_v3',
  messages:'dl_messages_v3',
  chart:'dl_chart_v3'
};

const appPages=[
  'overview.html',
  'profile.html',
  'quality.html',
  'cleaning.html',
  'statistics.html',
  'correlation.html',
  'visualization.html',
  'insights.html',
  'dashboard.html',
  'datasets.html',
  'report.html',
  'contact.html'
];

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const page=()=>location.pathname.split('/').pop()||'index.html';

const read=(k,d)=>{
  try{
    return JSON.parse(localStorage.getItem(k))??d
  }catch{
    return d
  }
};

const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

const toast=(msg,ok=true)=>{
  let t=$('#dlToast');

  if(!t){
    t=document.createElement('div');
    t.id='dlToast';
    t.className='toast';
    document.body.appendChild(t);
  }

  t.textContent=msg;
  t.style.background=ok?'#233b4b':'#8b3030';

  requestAnimationFrame(()=>{
    t.classList.add('show')
  });

  setTimeout(()=>{
    t.classList.remove('show')
  },2600);
};

function session(){
  return read(K.session,null)
}

function guard(){
  if(appPages.includes(page())&&!session()){
    location.replace('login.html');
    return false
  }

  if((page()==='login.html'||page()==='register.html')&&session()){
    location.replace('overview.html');
    return false
  }

  return true
}

function auth(){

  if(page()==='register.html'){

    const f=$('form');
    const b=$('.primary');

    if(!f||!b)return;

    b.type='submit';

    f.addEventListener('submit',e=>{
      e.preventDefault();

      const i=$$('input',f);
      const full=i[0].value.trim();
      const user=i[1].value.trim();
      const email=i[2].value.trim().toLowerCase();
      const pass=i[3].value;

      if(
        full.length<2||
        user.length<3||
        pass.length<4
      ){
        return toast(
          'أدخل بيانات صحيحة، وكلمة مرور 4 أحرف على الأقل.',
          false
        )
      }

      let users=read(K.users,[]);

      if(
        users.some(
          x=>x.username.toLowerCase()===user.toLowerCase()
        )
      ){
        return toast(
          'اسم المستخدم موجود مسبقاً.',
          false
        )
      }

      if(users.some(x=>x.email===email)){
        return toast(
          'البريد الإلكتروني مستخدم مسبقاً.',
          false
        )
      }

      users.push({
        id:Date.now(),
        fullName:full,
        username:user,
        email,
        password:pass,
        createdAt:new Date().toISOString()
      });

      write(K.users,users);

      toast(
        'تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول.'
      );

      setTimeout(()=>{
        location.href='login.html'
      },700);
    })
  }

  if(page()==='login.html'){

    const f=$('form');
    const b=$('.primary');

    if(!f||!b)return;

    b.type='submit';

    f.addEventListener('submit',e=>{
      e.preventDefault();

      const i=$$('input',f);

      const u=i[0].value.trim().toLowerCase();
      const p=i[1].value;

      const user=read(K.users,[]).find(
        x=>
          (
            x.username.toLowerCase()===u||
            x.email===u
          )&&
          x.password===p
      );

      if(!user){
        return toast(
          'اسم المستخدم أو كلمة المرور غير صحيحة.',
          false
        )
      }

      write(K.session,{
        id:user.id,
        username:user.username,
        fullName:user.fullName,
        loginAt:new Date().toISOString()
      });

      location.href='overview.html'
    })
  }
}

function shell(){

  if(!appPages.includes(page()))return;

  const s=session();

  const header=$('header');

  if(header){

    let menu=document.createElement('button');

    menu.className='mobile-menu';
    menu.type='button';

    menu.setAttribute(
      'aria-label',
      'فتح القائمة'
    );

    menu.textContent='☰';

    header.prepend(menu);

    let chip=document.createElement('span');

    chip.className='user-chip';

    chip.textContent=
      s?`مرحباً، ${s.fullName}`:'';

    $('.header-actions',header)?.prepend(chip);

    menu.onclick=()=>{
      $('.sidebar')?.classList.toggle('open');
      $('.sidebar-backdrop')?.classList.toggle('open')
    }
  }

  let back=document.createElement('div');

  back.className='sidebar-backdrop';

  document.body.appendChild(back);

  back.onclick=()=>{
    $('.sidebar')?.classList.remove('open');
    back.classList.remove('open')
  };

  $$('.sidebar a.danger').forEach(a=>
    a.onclick=e=>{
      e.preventDefault();

      localStorage.removeItem(K.session);

      location.href='login.html'
    }
  );

  $$('.sidebar nav a').forEach(a=>
    a.onclick=()=>{
      $('.sidebar')?.classList.remove('open')
    }
  )
}


/* ============================================================
   CSV
   ============================================================ */

function splitCSV(line){

  let a=[];
  let v='';
  let q=false;

  for(let i=0;i<line.length;i++){

    let c=line[i];

    if(c==='"'){

      if(q&&line[i+1]==='"'){
        v+='"';
        i++
      }else{
        q=!q
      }

    }else if(c===','&&!q){

      a.push(v.trim());
      v='';

    }else{

      v+=c
    }
  }

  a.push(v.trim());

  return a
}


function parseCSV(t){

  t=String(t||'')
    .replace(/^\uFEFF/,'')
    .replace(/\r/g,'');

  let lines=t
    .split('\n')
    .filter(x=>x.trim());

  if(lines.length<2){
    throw Error(
      'ملف CSV لا يحتوي على بيانات كافية.'
    )
  }

  let h=splitCSV(lines[0]);

  if(!h.length){
    throw Error(
      'تعذر قراءة عناوين أعمدة CSV.'
    )
  }

  return lines
    .slice(1)
    .map(l=>{

      let v=splitCSV(l);
      let o={};

      h.forEach((k,i)=>{
        let key=String(k||`Column_${i+1}`).trim();

        if(!key){
          key=`Column_${i+1}`
        }

        o[key]=v[i]??''
      });

      return o

    })
    .filter(row=>
      Object.values(row).some(v=>
        String(v).trim()!==''
      )
    )
}


/* ============================================================
   JSON
   ============================================================ */

function parseJSON(t){

  let x;

  try{
    x=JSON.parse(t)
  }catch{
    throw Error(
      'ملف JSON غير صالح أو يحتوي على خطأ في الصيغة.'
    )
  }

  if(Array.isArray(x)){

    if(!x.length){
      throw Error(
        'ملف JSON لا يحتوي على سجلات.'
      )
    }

    return x
  }

  if(
    x&&
    typeof x==='object'&&
    Array.isArray(x.data)
  ){

    if(!x.data.length){
      throw Error(
        'ملف JSON لا يحتوي على سجلات.'
      )
    }

    return x.data
  }

  throw Error(
    'JSON يجب أن يكون مصفوفة سجلات أو يحتوي على مصفوفة باسم data.'
  )
}


/* ============================================================
   EXCEL
   ============================================================ */

async function parseExcel(file){

  if(typeof XLSX==='undefined'){

    throw Error(
      'مكتبة Excel غير محملة. أضف مكتبة SheetJS إلى index.html.'
    )
  }

  let buffer=await file.arrayBuffer();

  let workbook;

  try{

    workbook=XLSX.read(buffer,{
      type:'array',
      cellDates:true
    });

  }catch(error){

    throw Error(
      'تعذر قراءة ملف Excel. تأكد أن الملف صالح.'
    )
  }

  if(
    !workbook||
    !workbook.SheetNames||
    !workbook.SheetNames.length
  ){

    throw Error(
      'ملف Excel لا يحتوي على أي Sheet.'
    )
  }

  const firstSheetName=
    workbook.SheetNames[0];

  const sheet=
    workbook.Sheets[firstSheetName];

  if(!sheet){

    throw Error(
      'تعذر الوصول إلى أول Sheet في ملف Excel.'
    )
  }

  let rows=XLSX.utils.sheet_to_json(
    sheet,
    {
      defval:'',
      raw:false
    }
  );

  if(!Array.isArray(rows)||!rows.length){

    throw Error(
      'أول Sheet في ملف Excel لا يحتوي على بيانات.'
    )
  }

  rows=rows.map(row=>{

    let clean={};

    Object.keys(row).forEach((key,index)=>{

      let newKey=String(key||'').trim();

      if(!newKey){
        newKey=`Column_${index+1}`
      }

      clean[newKey]=row[key]??''
    });

    return clean
  });

  return {
    rows,
    sheetName:firstSheetName,
    sheetNames:[...workbook.SheetNames]
  }
}


/* ============================================================
   قراءة أي ملف مدعوم
   ============================================================ */

async function parseFile(file){

  const name=file.name.toLowerCase();

  if(name.endsWith('.csv')){

    const text=await file.text();

    return {
      rows:parseCSV(text),
      sheetName:null,
      sheetNames:[]
    }
  }

  if(name.endsWith('.json')){

    const text=await file.text();

    return {
      rows:parseJSON(text),
      sheetName:null,
      sheetNames:[]
    }
  }

  if(
    name.endsWith('.xlsx')||
    name.endsWith('.xls')
  ){

    return await parseExcel(file)
  }

  throw Error(
    'نوع الملف غير مدعوم. استخدم CSV أو JSON أو XLSX أو XLS.'
  )
}


/* ============================================================
   Dataset
   ============================================================ */

function datasets(){
  return read(K.datasets,[])
}

function active(){

  let ds=datasets();
  let id=read(K.active,null);

  return ds.find(x=>x.id===id)||ds[0]||null
}

function saveDS(ds){

  let all=datasets();

  let i=all.findIndex(
    x=>x.id===ds.id
  );

  if(i>=0){
    all[i]=ds
  }else{
    all.unshift(ds)
  }

  write(K.datasets,all);
  write(K.active,ds.id)
}


/* ============================================================
   واجهة رفع الملفات
   ============================================================ */

function updateUploadInputs(){

  const accept='*/*';

  $$('input[type=file]').forEach(input=>{

    input.setAttribute(
      'accept',
      accept
    );

    input.removeAttribute('capture');

  });


  $$('label.upload-mini').forEach(label=>{

    const text=
      label.textContent
        .replace(/\s+/g,' ')
        .trim()
        .toLowerCase();

    if(
      text.includes('csv')||
      text.includes('dataset')||
      text.includes('رفع')
    ){

      const input=$('input[type=file]',label);

      if(!input)return;

      if(
        label.id==='pageFile'||
        input.id==='pageFile'
      ){

        label.childNodes.forEach(node=>{
          if(node.nodeType===Node.TEXT_NODE){
            node.textContent=
              ' رفع CSV / JSON / Excel ';
          }
        });

      }else{

        label.childNodes.forEach(node=>{
          if(node.nodeType===Node.TEXT_NODE){
            node.textContent=
              ' رفع Dataset (CSV / JSON / Excel) ';
          }
        })
      }
    }
  });


  const noDataText=$('.no-data .muted');

  if(noDataText){

    noDataText.textContent=
      'ارفع ملف CSV أو JSON أو Excel من صفحة نظرة عامة أو مكتبة البيانات أولاً.'
  }
}


/* ============================================================
   رفع الملفات
   ============================================================ */

function uploads(){

  $$('input[type=file]').forEach(inp=>{

    if(inp.dataset.dlUploadBound==='1'){
      return
    }

    inp.dataset.dlUploadBound='1';

    inp.addEventListener('change',async()=>{

      const f=inp.files?.[0];

      if(!f)return;

      const name=f.name.toLowerCase();

      const allowed=
        name.endsWith('.csv')||
        name.endsWith('.json')||
        name.endsWith('.xlsx')||
        name.endsWith('.xls');

      if(!allowed){

        toast(
          'نوع الملف غير مدعوم. استخدم CSV أو JSON أو XLSX أو XLS.',
          false
        );

        inp.value='';

        return
      }

      if(f.size===0){

        toast(
          'الملف فارغ.',
          false
        );

        inp.value='';

        return
      }

      toast(
        `جاري قراءة الملف: ${f.name}`
      );

      try{

        const result=
          await parseFile(f);

        const rows=result.rows;

        if(!Array.isArray(rows)||!rows.length){

          throw Error(
            'لا توجد سجلات قابلة للتحليل في الملف.'
          )
        }

        const ds={

          id:Date.now(),

          name:f.name,

          type:f.name
            .split('.')
            .pop()
            .toUpperCase(),

          rows,

          createdAt:new Date().toISOString(),

          owner:session()?.id,

          sheetName:
            result.sheetName||null,

          sheetNames:
            result.sheetNames||[]
        };

        saveDS(ds);

        let extra='';

        if(
          result.sheetName&&
          result.sheetNames?.length>1
        ){

          extra=
            ` — تم اختيار أول Sheet: ${result.sheetName}`
        }

        toast(
          `تم رفع ${rows.length} سجل${extra}`
        );

        setTimeout(()=>{
          location.reload()
        },500);

      }catch(e){

        console.error(
          'DataLens file upload error:',
          e
        );

        toast(
          e?.message||
          'تعذر قراءة الملف.',
          false
        );

      }finally{

        inp.value='';
      }

    })
  })
}


/* ============================================================
   أدوات التحليل
   ============================================================ */

const cols=r=>
  r.length?Object.keys(r[0]):[];

const missing=v=>
  v===''||
  v===null||
  v===undefined||
  String(v).trim()==='';

const nums=(r,k)=>
  r
    .map(x=>Number(x[k]))
    .filter(Number.isFinite);

const mean=a=>
  a.length?
    a.reduce((s,x)=>s+x,0)/a.length:
    0;

const med=a=>{

  if(!a.length)return 0;

  let b=[...a]
    .sort((x,y)=>x-y);

  let m=Math.floor(b.length/2);

  return b.length%2?
    b[m]:
    (b[m-1]+b[m])/2
};

const sd=a=>{

  if(a.length<2)return 0;

  let m=mean(a);

  return Math.sqrt(
    a.reduce(
      (s,x)=>s+(x-m)**2,
      0
    )/(a.length-1)
  )
};

const q=(a,p)=>{

  if(!a.length)return 0;

  let b=[...a]
    .sort((x,y)=>x-y);

  let i=(b.length-1)*p;

  let l=Math.floor(i);
  let h=Math.ceil(i);

  return l===h?
    b[l]:
    b[l]+(b[h]-b[l])*(i-l)
};


function stats(a){

  let freq={};

  a.forEach(
    x=>freq[x]=(freq[x]||0)+1
  );

  let mode=
    Object.entries(freq)
      .sort((x,y)=>y[1]-x[1])[0]?.[0]??'-';

  return {
    n:a.length,
    mean:mean(a),
    median:med(a),
    mode,
    sd:sd(a),
    min:Math.min(...a),
    q1:q(a,.25),
    q3:q(a,.75),
    max:Math.max(...a)
  }
}


function corrRows(rows,a,b){

  let pairs=rows
    .map(r=>[
      Number(r[a]),
      Number(r[b])
    ])
    .filter(
      x=>
        Number.isFinite(x[0])&&
        Number.isFinite(x[1])
    );

  if(pairs.length<2)return 0;

  let x=pairs.map(z=>z[0]);
  let y=pairs.map(z=>z[1]);

  let mx=mean(x);
  let my=mean(y);

  let n=0;
  let dx=0;
  let dy=0;

  for(let i=0;i<x.length;i++){

    let A=x[i]-mx;
    let B=y[i]-my;

    n+=A*B;
    dx+=A*A;
    dy+=B*B;
  }

  return dx&&dy?
    n/Math.sqrt(dx*dy):
    0
}


function quality(rows){

  let c=cols(rows);

  let m=
    rows.reduce(
      (s,r)=>
        s+
        c.filter(
          k=>missing(r[k])
        ).length,
      0
    );

  let dup=
    rows.length-
    new Set(
      rows.map(
        r=>JSON.stringify(r)
      )
    ).size;

  let out=0;

  c.forEach(k=>{

    let a=nums(rows,k);

    if(a.length>=4){

      let lo=
        q(a,.25)-
        1.5*
        (
          q(a,.75)-
          q(a,.25)
        );

      let hi=
        q(a,.75)+
        1.5*
        (
          q(a,.75)-
          q(a,.25)
        );

      out+=a.filter(
        x=>x<lo||x>hi
      ).length
    }
  });

  let total=rows.length*c.length;

  let score=Math.max(
    0,
    Math.round(
      100-
      (
        total?
          m/total*60:
          0
      )-
      (
        rows.length?
          dup/rows.length*25:
          0
      )-
      (
        total?
          out/total*15:
          0
      )
    )
  );

  return {
    score,
    m,
    dup,
    out
  }
}


/* ============================================================
   لا توجد بيانات
   ============================================================ */

function noData(){

  let c=$('.content');

  if(
    c&&
    !$('.no-data',c)
  ){

    let p=document.createElement('div');

    p.className='card no-data';

    p.innerHTML=
      '<h2>لا توجد بيانات</h2>'+
      '<p class="muted">'+
      'ارفع ملف CSV أو JSON أو Excel من صفحة نظرة عامة أو مكتبة البيانات أولاً.'+
      '</p>'+
      '<a class="ghost" href="overview.html">'+
      'الذهاب إلى نظرة عامة'+
      '</a>';

    c.prepend(p)
  }
}


/* ============================================================
   Render
   ============================================================ */

function render(){

  let ds=active();

  let rows=ds?.rows||[];

  if(
    appPages.includes(page())&&
    !rows.length&&
    ![
      'overview.html',
      'datasets.html',
      'contact.html'
    ].includes(page())
  ){

    noData()
  }


  if(
    page()==='overview.html'&&
    rows.length
  ){

    let h=$$('.grid .card h2');

    let c=cols(rows);

    let qq=quality(rows);

    if(h[0])
      h[0].textContent=rows.length;

    if(h[1])
      h[1].textContent=c.length;

    if(h[2])
      h[2].textContent=qq.score+'%';

    $('.content .card .muted')
      ?.insertAdjacentHTML(
        'afterend',
        `<p class="dataset-note">
          <b>الملف النشط:</b> ${esc(ds.name)}
        </p>`
      )
  }


  if(
    page()==='profile.html'&&
    rows.length
  ){

    let tb=$('tbody');

    tb.innerHTML=
      cols(rows)
      .map(k=>{

        let vals=rows.map(
          r=>r[k]
        );

        let m=
          vals.filter(
            missing
          ).length;

        let n=
          nums(rows,k);

        let type=
          n.length>=
          Math.max(
            1,
            vals.filter(
              v=>!missing(v)
            ).length*.7
          )?
          'رقمي':
          'نصي';

        return `
          <tr>
            <td>${esc(k)}</td>
            <td>${type}</td>
            <td>${m}</td>
            <td>${new Set(vals).size}</td>
            <td>
              <span class="badge ${m?'warn':'good'}">
                ${m?'يحتاج مراجعة':'جيد'}
              </span>
            </td>
          </tr>
        `
      })
      .join('')
  }


  if(
    page()==='quality.html'&&
    rows.length
  ){

    let x=quality(rows);

    let cards=$$('.card');

    cards[0].innerHTML=
      `<h2>درجة الجودة</h2>
       <div class="quality-ring"
            style="--score:${x.score}%">
         <strong>${x.score}%</strong>
       </div>`;

    cards[1].innerHTML=
      `<h2>مشكلات البيانات</h2>
       <p>القيم المفقودة: <b>${x.m}</b></p>
       <p>الصفوف المكررة: <b>${x.dup}</b></p>
       <p>القيم الشاذة التقريبية: <b>${x.out}</b></p>`
  }


  if(
    page()==='statistics.html'&&
    rows.length
  ){

    let sel=$('select');

    let keys=
      cols(rows)
      .filter(
        k=>nums(rows,k).length
      );

    sel.innerHTML=
      '<option value="">اختر عموداً</option>'+
      keys
        .map(
          k=>`<option>${esc(k)}</option>`
        )
        .join('');

    sel.onchange=()=>{

      let a=nums(
        rows,
        sel.value
      );

      if(!a.length)return;

      let s=stats(a);

      let p=$('.card .muted');

      p.innerHTML=
        `<b>${esc(sel.value)}</b><br>
        العدد: ${s.n} |
        المتوسط: ${s.mean.toFixed(2)} |
        الوسيط: ${s.median.toFixed(2)} |
        المنوال: ${esc(s.mode)}<br>
        الانحراف المعياري: ${s.sd.toFixed(2)} |
        الأدنى: ${s.min} |
        Q1: ${s.q1.toFixed(2)} |
        Q3: ${s.q3.toFixed(2)} |
        الأعلى: ${s.max}`
    }
  }


  if(
    page()==='correlation.html'&&
    rows.length
  ){

    let keys=
      cols(rows)
      .filter(
        k=>nums(rows,k).length>1
      );

    let box=$('.static-placeholder');

    if(keys.length<2){

      box.innerHTML=
        '<p>نحتاج متغيرين رقميين على الأقل.</p>'

    }else{

      box.innerHTML=
  `<div class="table-wrap correlation-scroll">
  <table class="corr-table">
        <thead>
              <tr>
                <th>المتغير</th>
                ${keys.map(
                  k=>`<th>${esc(k)}</th>`
                ).join('')}
              </tr>
            </thead>

            <tbody>

              ${keys.map(a=>
                `<tr>
                  <th>${esc(a)}</th>

                  ${keys.map(b=>
                    `<td>
                      ${corrRows(rows,a,b).toFixed(3)}
                    </td>`
                  ).join('')}

                </tr>`
              ).join('')}

            </tbody>
          </table>
        </div>`
    }
  }


  if(page()==='datasets.html')
    renderLibrary();

  if(
    page()==='cleaning.html'&&
    rows.length
  )
    renderCleaning(ds);

  if(
    page()==='visualization.html'&&
    rows.length
  )
    renderViz(rows,ds);

  if(
    page()==='insights.html'&&
    rows.length
  )
    renderInsights(rows);

  if(
    page()==='dashboard.html'&&
    rows.length
  )
    renderDashboard(rows,ds);

  if(
    page()==='report.html'&&
    rows.length
  )
    renderReport(rows,ds);

  if(page()==='contact.html')
    renderContact();
}


/* ============================================================
   مكتبة البيانات
   ============================================================ */

function renderLibrary(){

  let tb=$('tbody');

  let all=datasets();

  let aid=active()?.id;

  if(!all.length)return;

  tb.innerHTML=
    all
      .map(d=>
        `<tr>

          <td>
            ${esc(d.name)}
            ${d.id===aid?
              ' <span class="badge good">نشط</span>':
              ''
            }
          </td>

          <td>
            ${esc(d.type)}
          </td>

          <td>
            ${new Date(d.createdAt)
              .toLocaleString('ar')}
          </td>

          <td class="actions">

            <button
              class="ghost use-ds"
              data-id="${d.id}">
              استخدام
            </button>

            <button
              class="danger del-ds"
              data-id="${d.id}">
              حذف
            </button>

          </td>

        </tr>`
      )
      .join('');


  $$('.use-ds').forEach(b=>
    b.onclick=()=>{

      write(
        K.active,
        Number(b.dataset.id)
      );

      location.reload()
    }
  );


  $$('.del-ds').forEach(b=>
    b.onclick=()=>{

      if(!confirm('حذف الملف؟'))
        return;

      let id=
        Number(b.dataset.id);

      let a=
        datasets()
        .filter(
          x=>x.id!==id
        );

      write(K.datasets,a);

      if(
        read(K.active,null)===id
      ){

        write(
          K.active,
          a[0]?.id||null
        )
      }

      location.reload()
    }
  )
}


/* ============================================================
   Cleaning
   ============================================================ */

function renderCleaning(ds){

  let card=$('.content .card');

  card.insertAdjacentHTML(
    'beforeend',
    '<div class="clean-options">'+
      '<label>'+
        '<input id="fillMissing" type="checkbox" checked>'+
        ' معالجة القيم المفقودة'+
      '</label>'+
      '<label>'+
        '<input id="trimText" type="checkbox" checked>'+
        ' إزالة المسافات الزائدة'+
      '</label>'+
    '</div>'+
    '<div id="cleanResult" class="analysis-result muted"></div>'
  );

  let btns=$$('button',card);

  btns[0].onclick=()=>{

    let rows=
      ds.rows.map(
        r=>({...r})
      );

    let c=cols(rows);

    c.forEach(k=>{

      let a=nums(rows,k);

      let replacement=
        a.length?
          mean(a):
          'غير محدد';

      rows.forEach(r=>{

        if(
          $('#trimText')?.checked&&
          typeof r[k]==='string'
        ){
          r[k]=r[k].trim()
        }

        if(
          $('#fillMissing')?.checked&&
          missing(r[k])
        ){
          r[k]=replacement
        }
      })
    });

    rows=[
      ...new Map(
        rows.map(
          r=>[
            JSON.stringify(r),
            r
          ]
        )
      ).values()
    ];

    ds.rows=rows;

    saveDS(ds);

    $('#cleanResult').textContent=
      `تم التنظيف. عدد السجلات الآن: ${rows.length}`;

    toast(
      'تم تنظيف البيانات وحفظ النسخة محلياً'
    )
  };


  btns[1].onclick=()=>{

    ds.rows=[
      ...new Map(
        ds.rows.map(
          r=>[
            JSON.stringify(r),
            r
          ]
        )
      ).values()
    ];

    saveDS(ds);

    toast(
      'تم حذف التكرارات'
    );

    setTimeout(
      ()=>location.reload(),
      300
    )
  }
}


/* ============================================================
   Visualization
   ============================================================ */

function renderViz(rows,ds){

  let sels=$$('select');

  let type=sels[0];
  let sx=sels[1];
  let sy=sels[2];

  if(!type||!sx||!sy){
    return;
  }

  let keys=cols(rows);

  let numeric=
    keys.filter(
      k=>nums(rows,k).length
    );

  function fillAxisOptions(){

    const oldX=sx.value;
    const oldY=sy.value;

    const chartType=
      String(type.value||'')
      .toLowerCase();

    const isScatter=
      chartType.includes('scatter');

    const xKeys=
      isScatter?
      numeric:
      keys;

    sx.innerHTML=
      '<option value="">اختر</option>'+
      xKeys
        .map(
          k=>`<option value="${esc(k)}">${esc(k)}</option>`
        )
        .join('');

    sy.innerHTML=
      '<option value="">اختر</option>'+
      numeric
        .map(
          k=>`<option value="${esc(k)}">${esc(k)}</option>`
        )
        .join('');

    if(xKeys.includes(oldX)){
      sx.value=oldX;
    }

    if(numeric.includes(oldY)){
      sy.value=oldY;
    }
  }

  fillAxisOptions();

  type.addEventListener(
    'change',
    fillAxisOptions
  );

  let canvas=
    document.createElement('canvas');

  canvas.width=900;
  canvas.height=360;
  canvas.className='chart-canvas';

  const card=
    $('.content .card');

  if(!card){
    return;
  }

  const oldCanvas=
    $('.chart-canvas',card);

  if(oldCanvas){
    oldCanvas.remove();
  }

  card.appendChild(canvas);

  const drawBtn=
    $('.primary',card);

  if(!drawBtn){
    return;
  }

  drawBtn.onclick=()=>{

    draw(
      canvas,
      rows,
      type.value,
      sx.value,
      sy.value,
      ds?.id||null
    );

  };
}


/* ============================================================
   حفظ الرسم البياني للتقرير
   ============================================================ */

function saveChartForReport(
  canvas,
  type,
  xk,
  yk,
  datasetId
){

  if(!canvas){
    return false;
  }

  try{

    const image=
      canvas.toDataURL(
        'image/png'
      );

    if(
      !image||
      image==='data:,'
    ){
      return false;
    }

    write(
      K.chart,
      {
        datasetId:datasetId||null,
        type:String(type||''),
        x:xk||'',
        y:yk||'',
        image,
        createdAt:new Date().toISOString()
      }
    );

    return true;

  }catch(error){

    console.error(
      'DataLens chart save error:',
      error
    );

    return false;
  }
}


/* ============================================================
   حذف الرسم المحفوظ
   ============================================================ */

function clearSavedChart(){

  try{
    localStorage.removeItem(K.chart);
  }catch(error){
    console.error(
      'DataLens chart clear error:',
      error
    );
  }
}


/* ============================================================
   Draw
   ============================================================ */

function draw(
  cv,
  rows,
  type,
  xk,
  yk,
  datasetId
){

  if(!xk){

    return toast(
      'اختر المحور X',
      false
    );

  }

  let ctx=
    cv.getContext('2d');

  if(!ctx){
    return;
  }

  let W=cv.width;
  let H=cv.height;

  ctx.clearRect(
    0,
    0,
    W,
    H
  );

  ctx.fillStyle='#fff';

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  ctx.fillStyle='#233b4b';

  ctx.font='16px serif';

  const chartType=
    String(type||'')
    .toLowerCase();

  const isScatter=
    chartType.includes('scatter');


  /* ============================================================
     PIE CHART
     ============================================================ */

  if(chartType==='pie'){

    let frequency={};

    rows.forEach(r=>{

      let value=
        String(
          r[xk]??''
        ).trim();

      if(value){
        frequency[value]=
          (frequency[value]||0)+1;
      }

    });

    let pieData=
      Object.entries(frequency)
        .sort(
          (a,b)=>b[1]-a[1]
        );

    if(!pieData.length){

      return toast(
        'لا توجد بيانات صالحة للرسم الدائري',
        false
      );

    }

    const maxCategories=8;

    if(pieData.length>maxCategories){

      const main=
        pieData.slice(
          0,
          maxCategories-1
        );

      const other=
        pieData
          .slice(maxCategories-1)
          .reduce(
            (sum,item)=>
              sum+Number(item[1]),
            0
          );

      main.push([
        'أخرى',
        other
      ]);

      pieData=main;
    }

    const total=
      pieData.reduce(
        (sum,item)=>
          sum+Number(item[1]),
        0
      );

    if(!total){

      return toast(
        'لا توجد بيانات صالحة للرسم الدائري',
        false
      );

    }

    const centerX=285;
    const centerY=175;
    const radius=125;

    const pieColors=[
      '#53758a',
      '#6B6240',
      '#8B5E5E',
      '#557C55',
      '#6C6A8F',
      '#9A7352',
      '#4F7D7A',
      '#7B6874'
    ];

    let startAngle=
      -Math.PI/2;

    pieData.forEach(
      (item,index)=>{

        const value=
          Number(item[1])||0;

        const sliceAngle=
          (value/total)*
          Math.PI*2;

        const endAngle=
          startAngle+
          sliceAngle;

        ctx.beginPath();

        ctx.moveTo(
          centerX,
          centerY
        );

        ctx.arc(
          centerX,
          centerY,
          radius,
          startAngle,
          endAngle
        );

        ctx.closePath();

        ctx.fillStyle=
          pieColors[
            index%pieColors.length
          ];

        ctx.fill();

        ctx.strokeStyle='#ffffff';
        ctx.lineWidth=2;

        ctx.stroke();


        const middleAngle=
          startAngle+
          sliceAngle/2;

        const labelRadius=
          radius*0.64;

        const labelX=
          centerX+
          Math.cos(middleAngle)*
          labelRadius;

        const labelY=
          centerY+
          Math.sin(middleAngle)*
          labelRadius;

        const percentage=
          (value/total)*100;


        if(percentage>=5){

          ctx.fillStyle='#ffffff';

          ctx.font=
            'bold 13px serif';

          ctx.textAlign='center';

          ctx.textBaseline='middle';

          ctx.fillText(
            percentage.toFixed(1)+'%',
            labelX,
            labelY
          );

        }

        startAngle=endAngle;

      }
    );


    ctx.textAlign='center';

    ctx.textBaseline='alphabetic';

    ctx.fillStyle='#233b4b';

    ctx.font=
      'bold 17px serif';

    ctx.fillText(
      'توزيع '+xk,
      centerX,
      25
    );


    const legendX=500;

    let legendY=65;

    ctx.font=
      '13px serif';

    ctx.textAlign='left';

    pieData.forEach(
      (item,index)=>{

        const value=
          Number(item[1])||0;

        const percentage=
          (value/total)*100;

        ctx.fillStyle=
          pieColors[
            index%pieColors.length
          ];

        ctx.fillRect(
          legendX,
          legendY-12,
          16,
          16
        );

        ctx.fillStyle='#233b4b';

        ctx.fillText(
          String(item[0])+
          ' — '+
          percentage.toFixed(1)+
          '%',
          legendX+25,
          legendY
        );

        legendY+=28;

      }
    );


    ctx.fillStyle='#66757f';

    ctx.font=
      '12px serif';

    ctx.textAlign='left';

    ctx.fillText(
      'عدد الفئات: '+pieData.length,
      legendX,
      315
    );

    ctx.fillText(
      'إجمالي القيم: '+total,
      legendX,
      335
    );


    const saved=
      saveChartForReport(
        cv,
        type,
        xk,
        '',
        datasetId
      );

    if(saved){

      toast(
        'تم إنشاء الرسم الدائري وحفظه للتقرير'
      );

    }

    return;
  }


  /* ============================================================
     SCATTER PLOT
     ============================================================ */

  if(isScatter){

    if(!yk){

      return toast(
        'اختر المحور Y للرسم المبعثر',
        false
      );

    }

    let data=
      rows
        .map(r=>[
          Number(r[xk]),
          Number(r[yk])
        ])
        .filter(
          z=>
            Number.isFinite(z[0])&&
            Number.isFinite(z[1])
        );

    if(!data.length){

      return toast(
        'لا توجد بيانات رقمية صالحة للرسم المبعثر',
        false
      );

    }

    let xs=
      data.map(
        z=>z[0]
      );

    let ys=
      data.map(
        z=>z[1]
      );

    let minX=
      Math.min(...xs);

    let maxX=
      Math.max(...xs);

    let minY=
      Math.min(...ys);

    let maxY=
      Math.max(...ys);

    if(minX===maxX){

      let pad=
        Math.abs(minX)*0.1||1;

      minX-=pad;
      maxX+=pad;

    }

    if(minY===maxY){

      let pad=
        Math.abs(minY)*0.1||1;

      minY-=pad;
      maxY+=pad;

    }

    const left=70;
    const right=25;
    const top=25;
    const bottom=305;

    const plotWidth=
      W-left-right;

    const plotHeight=
      bottom-top;

    const scaleX=value=>
      left+
      (
        (value-minX)/
        (maxX-minX)
      )*
      plotWidth;

    const scaleY=value=>
      bottom-
      (
        (value-minY)/
        (maxY-minY)
      )*
      plotHeight;

    ctx.strokeStyle='#e2e6e8';
    ctx.lineWidth=1;

    ctx.fillStyle='#66757f';
    ctx.font='12px serif';

    const ticks=5;

    for(
      let i=0;
      i<=ticks;
      i++
    ){

      let ratio=
        i/ticks;

      let py=
        bottom-
        ratio*
        plotHeight;

      ctx.beginPath();

      ctx.moveTo(
        left,
        py
      );

      ctx.lineTo(
        W-right,
        py
      );

      ctx.stroke();

      let yValue=
        minY+
        ratio*
        (maxY-minY);

      ctx.fillText(
        formatAxisNumber(yValue),
        8,
        py+4
      );

      let px=
        left+
        ratio*
        plotWidth;

      ctx.beginPath();

      ctx.moveTo(
        px,
        top
      );

      ctx.lineTo(
        px,
        bottom
      );

      ctx.stroke();

      let xValue=
        minX+
        ratio*
        (maxX-minX);

      ctx.fillText(
        formatAxisNumber(xValue),
        px-15,
        bottom+20
      );

    }

    ctx.strokeStyle='#9aa8b1';
    ctx.lineWidth=1.5;

    ctx.beginPath();

    ctx.moveTo(
      left,
      top
    );

    ctx.lineTo(
      left,
      bottom
    );

    ctx.lineTo(
      W-right,
      bottom
    );

    ctx.stroke();

    ctx.fillStyle='#6B6240';

    data.forEach(
      point=>{

        const x=
          scaleX(
            point[0]
          );

        const y=
          scaleY(
            point[1]
          );

        ctx.beginPath();

        ctx.arc(
          x,
          y,
          4,
          0,
          Math.PI*2
        );

        ctx.fill();

      }
    );

    ctx.fillStyle='#233b4b';
    ctx.font='16px serif';

    ctx.fillText(
      `${xk} × ${yk}`,
      left,
      350
    );

    const saved=
      saveChartForReport(
        cv,
        type,
        xk,
        yk,
        datasetId
      );

    if(saved){

      toast(
        'تم إنشاء الرسم وحفظه للتقرير'
      );

    }

    return;
  }


  /* ============================================================
     BAR / LINE
     ============================================================ */

  let data;

  if(!yk){

    let f={};

    rows.forEach(
      r=>
        f[r[xk]]=
        (f[r[xk]]||0)+1
    );

    data=
      Object.entries(f)
        .slice(0,12);

  }else{

    data=
      rows
        .slice(0,30)
        .map(
          r=>[
            r[xk],
            Number(r[yk])
          ]
        )
        .filter(
          z=>
            Number.isFinite(z[1])
        );

  }

  if(!data.length){

    return toast(
      'لا توجد بيانات صالحة للرسم',
      false
    );

  }

  let max=
    Math.max(
      ...data.map(
        z=>Number(z[1])||0
      ),
      1
    );

  let left=55;
  let bottom=310;

  let w=
    (W-left-20)/
    data.length;

  ctx.strokeStyle='#9aa8b1';

  ctx.beginPath();

  ctx.moveTo(
    left,
    20
  );

  ctx.lineTo(
    left,
    bottom
  );

  ctx.lineTo(
    W-15,
    bottom
  );

  ctx.stroke();

  ctx.fillStyle='#53758a';

  data.forEach(
    (z,i)=>{

      let h=
        (Number(z[1])||0)/
        max*
        250;

      let x=
        left+
        i*w+
        3;

      if(chartType==='line'){

        if(i===0){

          ctx.beginPath();

          ctx.moveTo(
            x,
            bottom-h
          );

        }else{

          ctx.lineTo(
            x,
            bottom-h
          );

          ctx.strokeStyle='#24465b';

          ctx.stroke();

        }

      }else{

        ctx.fillStyle='#53758a';

        ctx.fillRect(
          x,
          bottom-h,
          Math.max(
            3,
            w-6
          ),
          h
        );

      }

    }
  );

  ctx.fillStyle='#233b4b';

  ctx.font='16px serif';

  ctx.fillText(
    `${xk}${yk?' × '+yk:''}`,
    left,
    345
  );

  const saved=
    saveChartForReport(
      cv,
      type,
      xk,
      yk,
      datasetId
    );

  if(saved){

    toast(
      'تم إنشاء الرسم وحفظه للتقرير'
    );

  }
}


/* ============================================================
   تنسيق أرقام محاور Scatter Plot
   ============================================================ */

function formatAxisNumber(value){

  if(!Number.isFinite(value)){
    return '';
  }

  const abs=
    Math.abs(value);

  if(
    abs>=1000000||
    (
      abs>0&&
      abs<0.001
    )
  ){

    return value.toExponential(1);

  }

  if(
    Number.isInteger(value)
  ){

    return String(value);

  }

  return Number(
    value.toFixed(2)
  ).toString();
}


/* ============================================================
   Insights
   ============================================================ */

function renderInsights(rows){

  let box=$('.static-placeholder');

  let c=cols(rows);

  let qq=quality(rows);

  let num=
    c.filter(
      k=>nums(rows,k).length>1
    );

  let items=[
    `مجموعة البيانات تحتوي على ${rows.length} سجل و ${c.length} عمود.`,
    `درجة جودة البيانات التقديرية ${qq.score}%، مع ${qq.m} قيمة مفقودة و ${qq.dup} صف مكرر.`
  ];

  if(num.length){

    let best=null;

    for(
      let i=0;
      i<num.length;
      i++
    ){

      for(
        let j=i+1;
        j<num.length;
        j++
      ){

        let v=
          corrRows(
            rows,
            num[i],
            num[j]
          );

        if(
          !best||
          Math.abs(v)>
          Math.abs(best.v)
        ){

          best={
            a:num[i],
            b:num[j],
            v
          }
        }
      }
    }

    if(best){

      items.push(
        `أقوى ارتباط رقمي بين ${best.a} و ${best.b} وقيمته ${best.v.toFixed(3)}.`
      )
    }

    num
      .slice(0,3)
      .forEach(k=>
        items.push(
          `متوسط ${k} يساوي ${mean(nums(rows,k)).toFixed(2)}.`
        )
      )
  }

  box.style.display='block';

  box.innerHTML=
    items
      .map(
        x=>
          `<div class="insight">
            ${esc(x)}
          </div>`
      )
      .join('')
}


/* ============================================================
   Dashboard
   ============================================================ */

function renderDashboard(rows,ds){

  let c=$('.content');

  let qq=quality(rows);

  let keys=cols(rows);

  let num=
    keys.filter(
      k=>nums(rows,k).length
    );

  c.innerHTML=
    `<div class="grid">

      <div class="card">
        <b>الملف</b>
        <h2>${esc(ds.name)}</h2>
      </div>

      <div class="card">
        <b>السجلات</b>
        <h2>${rows.length}</h2>
      </div>

      <div class="card">
        <b>الأعمدة</b>
        <h2>${keys.length}</h2>
      </div>

      <div class="card">
        <b>الجودة</b>
        <h2>${qq.score}%</h2>
      </div>

    </div>

    <div
      class="card"
      style="margin-top:14px"
    >

      <h2>
        ملخص المتغيرات الرقمية
      </h2>

      <div class="table-wrap">

        <table class="data-table">

          <thead>

            <tr>
              <th>المتغير</th>
              <th>المتوسط</th>
              <th>الوسيط</th>
              <th>الانحراف المعياري</th>
            </tr>

          </thead>

          <tbody>

            ${num.map(k=>{

              let a=nums(rows,k);

              return `
                <tr>
                  <td>${esc(k)}</td>
                  <td>${mean(a).toFixed(2)}</td>
                  <td>${med(a).toFixed(2)}</td>
                  <td>${sd(a).toFixed(2)}</td>
                </tr>
              `

            }).join('')}

          </tbody>

        </table>

      </div>

    </div>`
}


/* ============================================================
   Report — بناء التقرير
   ============================================================ */

function renderReport(rows,ds){

  let card=$('.content .card');

  if(!card)return;

  let qq=quality(rows);

  let keys=cols(rows);

  let num=
    keys.filter(
      k=>nums(rows,k).length
    );

  const statRows=num.map(k=>{

    let s=stats(nums(rows,k));

    return `
      <tr>
        <td>${esc(k)}</td>
        <td>${s.n}</td>
        <td>${s.mean.toFixed(2)}</td>
        <td>${s.median.toFixed(2)}</td>
        <td>${s.sd.toFixed(2)}</td>
        <td>${s.min.toFixed(2)}</td>
        <td>${s.max.toFixed(2)}</td>
      </tr>
    `

  }).join('');

  card.innerHTML=`

    <div class="report-main-heading">

      <h2>تقرير التحليل</h2>

      <p class="muted">
        تم إنشاء التقرير من مجموعة البيانات النشطة في DataLens.
      </p>

    </div>


    <div
      id="reportSummary"
      class="report-section"
    >

      <b>مجموعة البيانات:</b>
      ${esc(ds.name)}

      <br>

      <b>السجلات:</b>
      ${rows.length}

      |

      <b>الأعمدة:</b>
      ${keys.length}

    </div>


    <div class="report-main-actions">

      <button
        class="primary"
        id="previewReportBtn"
        type="button">

        📄 معاينة التقرير

      </button>

    </div>
  `;


  const previewBtn=$('#previewReportBtn');

  if(previewBtn){

    previewBtn.onclick=()=>{

      openReportPreview(
        rows,
        ds,
        qq,
        keys,
        num,
        statRows
      );

    }

  }
}


/* ============================================================
   Report Preview
   ============================================================ */

function buildReportPaper(
  rows,
  ds,
  qq,
  keys,
  num,
  statRows
){

  const generatedAt=
    new Date().toLocaleString('ar');


  /* ============================================================
     الرسم البياني المحفوظ
     ============================================================ */

  const savedChart=
    read(
      K.chart,
      null
    );

  let chartSummary='';


  if(
    savedChart&&
    savedChart.image&&
    (
      !savedChart.datasetId||
      savedChart.datasetId===ds.id
    )
  ){

    const chartType=
      esc(
        savedChart.type||
        'غير محدد'
      );

    const chartX=
      esc(
        savedChart.x||
        ''
      );

    const chartY=
      esc(
        savedChart.y||
        ''
      );

    chartSummary=`

      <div class="report-section report-chart-section">

        <h3>
          التصور البياني
        </h3>

        <div class="report-chart-info">

          <span>
            نوع الرسم:
            <b>${chartType}</b>
          </span>

          ${
            chartX?
            `
              <span>
                المحور X:
                <b>${chartX}</b>
              </span>
            `:
            ''
          }

          ${
            chartY?
            `
              <span>
                المحور Y:
                <b>${chartY}</b>
              </span>
            `:
            ''
          }

        </div>

        <div class="report-chart-image-wrap">

          <img
            class="report-chart-image"
            src="${savedChart.image}"
            alt="الرسم البياني"
          >

        </div>

      </div>

    `;

  }else{

    chartSummary=`

      <div class="report-section report-chart-section">

        <h3>
          التصور البياني
        </h3>

        <p>
          لم يتم إنشاء رسم بياني لهذا الملف بعد.
          انتقل إلى صفحة التصور البياني وأنشئ الرسم أولاً،
          ثم عد إلى التقرير.
        </p>

      </div>

    `;
  }


  /* ============================================================
     الإحصاءات الوصفية
     ============================================================ */

  const numericSummary=
    num.length?
      `
        <div class="report-table-scroll">

          <table class="report-stat-table">

            <thead>

              <tr>
                <th>المتغير</th>
                <th>العدد</th>
                <th>المتوسط</th>
                <th>الوسيط</th>
                <th>الانحراف المعياري</th>
                <th>الأدنى</th>
                <th>الأعلى</th>
              </tr>

            </thead>

            <tbody>
              ${statRows}
            </tbody>

          </table>

        </div>
      `:
      `
        <p>
          لا توجد أعمدة رقمية قابلة للتحليل الإحصائي.
        </p>
      `;


  /* ============================================================
     مصفوفة الارتباط
     ============================================================ */

  const correlationKeys=
    keys.filter(
      k=>nums(rows,k).length>1
    );


  let correlationSummary='';


  if(correlationKeys.length>=2){

    const correlationRows=
      correlationKeys.map(a=>{

        return `
          <tr>

            <th>
              ${esc(a)}
            </th>

            ${correlationKeys.map(b=>{

              const value=
                corrRows(
                  rows,
                  a,
                  b
                );

              return `
                <td>
                  ${value.toFixed(3)}
                </td>
              `;

            }).join('')}

          </tr>
        `;

      }).join('');


    const correlationHeaders=
      correlationKeys.map(k=>`
        <th>
          ${esc(k)}
        </th>
      `).join('');


    correlationSummary=`
      <div class="report-section report-correlation-section">

        <h3>
          مصفوفة الارتباط
        </h3>

        <p class="report-correlation-note">
          تم حساب معاملات ارتباط بيرسون بين المتغيرات الرقمية.
          تتراوح قيمة معامل الارتباط بين -1 و +1.
        </p>

        <div class="report-correlation-scroll">

          <table class="report-correlation-table">

            <thead>

              <tr>

                <th>
                  المتغير
                </th>

                ${correlationHeaders}

              </tr>

            </thead>

            <tbody>

              ${correlationRows}

            </tbody>

          </table>

        </div>

      </div>
    `;

  }else{

    correlationSummary=`
      <div class="report-section report-correlation-section">

        <h3>
          مصفوفة الارتباط
        </h3>

        <p>
          لا توجد متغيرات رقمية كافية لحساب مصفوفة الارتباط.
        </p>

      </div>
    `;
  }


  /* ============================================================
     التقرير الكامل
     ============================================================ */

  return `

    <div class="report-paper">

      <!-- رأس التقرير -->

      <div class="report-paper-header">

        <div class="report-paper-logo">
          DL
        </div>

        <h1>
          DataLens
        </h1>

        <p>
          Intelligent Data Quality & Analytics Platform
        </p>

        <p>
          تقرير تحليل البيانات
        </p>

      </div>


      <!-- معلومات التقرير -->

      <div class="report-meta">

        <div class="report-meta-item">

          <span>
            مجموعة البيانات
          </span>

          <strong>
            ${esc(ds.name)}
          </strong>

        </div>


        <div class="report-meta-item">

          <span>
            تاريخ إنشاء التقرير
          </span>

          <strong>
            ${esc(generatedAt)}
          </strong>

        </div>


        <div class="report-meta-item">

          <span>
            عدد السجلات
          </span>

          <strong>
            ${rows.length}
          </strong>

        </div>


        <div class="report-meta-item">

          <span>
            عدد الأعمدة
          </span>

          <strong>
            ${keys.length}
          </strong>

        </div>

      </div>


      <!-- ملخص البيانات -->

      <div class="report-section">

        <h3>
          ملخص البيانات
        </h3>

        <p>

          يحتوي ملف البيانات على

          <b>
            ${rows.length}
          </b>

          سجل و

          <b>
            ${keys.length}
          </b>

          عمود.

        </p>


        <p>

          نوع الملف:

          <b>
            ${esc(ds.type||'غير محدد')}
          </b>

        </p>


        ${
          ds.sheetName?
          `
            <p>

              ورقة Excel المستخدمة:

              <b>
                ${esc(ds.sheetName)}
              </b>

            </p>
          `:
          ''
        }

      </div>


      <!-- جودة البيانات -->

      <div class="report-section">

        <h3>
          جودة البيانات
        </h3>


        <div class="report-quality-grid">

          <div class="report-quality-item">

            <span>
              درجة الجودة
            </span>

            <strong>
              ${qq.score}%
            </strong>

          </div>


          <div class="report-quality-item">

            <span>
              القيم المفقودة
            </span>

            <strong>
              ${qq.m}
            </strong>

          </div>


          <div class="report-quality-item">

            <span>
              التكرارات
            </span>

            <strong>
              ${qq.dup}
            </strong>

          </div>


          <div class="report-quality-item">

            <span>
              القيم الشاذة
            </span>

            <strong>
              ${qq.out}
            </strong>

          </div>

        </div>

      </div>


      <!-- الإحصاءات -->

      <div class="report-section">

        <h3>
          الإحصاءات الوصفية
        </h3>

        ${numericSummary}

      </div>


      <!-- الرسم البياني -->

      ${chartSummary}


      <!-- مصفوفة الارتباط -->

      ${correlationSummary}


      <!-- ملاحظات التحليل -->

      <div class="report-section">

        <h3>
          ملاحظات التحليل
        </h3>

        <p>

          تم حساب الإحصاءات الوصفية للمتغيرات الرقمية
          المتاحة في مجموعة البيانات.

        </p>

        <p>

          تشمل المؤشرات المستخدمة المتوسط والوسيط
          والانحراف المعياري والقيم الدنيا والعليا.

        </p>

        <p>

          تم حساب مصفوفة الارتباط باستخدام
          معامل ارتباط بيرسون للمتغيرات الرقمية.

        </p>

        <p>

          درجة جودة البيانات هي درجة تقديرية مبنية على
          القيم المفقودة والتكرارات والقيم الشاذة.

        </p>

      </div>


      <!-- التذييل -->

      <div class="report-footer">

        DataLens — From Raw Data to Clear Insights.

        <br>

        تم إنشاء هذا التقرير محلياً بواسطة منصة DataLens.

      </div>

    </div>

  `;
}


/* ============================================================
   فتح معاينة التقرير
   ============================================================ */

function openReportPreview(
  rows,
  ds,
  qq,
  keys,
  num,
  statRows
){

  closeReportPreview();

  const overlay=
    document.createElement('div');

  overlay.id='reportPreviewOverlay';

  overlay.className=
    'report-preview-overlay open';

  overlay.innerHTML=`

    <div
      class="report-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="معاينة تقرير DataLens">

      <div class="report-preview-head">

        <div class="report-preview-title">

          <strong>
            معاينة التقرير
          </strong>

          <small>
            راجع التقرير قبل الطباعة أو حفظ PDF
          </small>

        </div>


        <button
          type="button"
          class="report-preview-close"
          id="closeReportPreview"
          aria-label="إغلاق">

          ×

        </button>

      </div>


      <div class="report-preview-body">

        ${buildReportPaper(
          rows,
          ds,
          qq,
          keys,
          num,
          statRows
        )}

      </div>


      <div class="report-preview-actions">

        <button
          type="button"
          class="ghost"
          id="closeReportBtn">

          رجوع

        </button>


        <button
          type="button"
          class="primary"
          id="printReportBtn">

          🖨️ طباعة / حفظ PDF

        </button>

      </div>

    </div>
  `;


  document.body.appendChild(overlay);

  const closeBtn=
    $('#closeReportPreview',overlay);

  const backBtn=
    $('#closeReportBtn',overlay);

  const printBtn=
    $('#printReportBtn',overlay);


  closeBtn?.addEventListener(
    'click',
    closeReportPreview
  );

  backBtn?.addEventListener(
    'click',
    closeReportPreview
  );

  printBtn?.addEventListener(
    'click',
    printReport
  );


  overlay.addEventListener(
    'click',
    e=>{
      if(e.target===overlay){
        closeReportPreview()
      }
    }
  );


  document.body.style.overflow='hidden';
}


/* ============================================================
   إغلاق معاينة التقرير
   ============================================================ */

function closeReportPreview(){

  const overlay=
    $('#reportPreviewOverlay');

  if(overlay){
    overlay.remove()
  }

  document.body.classList.remove(
    'report-printing'
  );

  document.body.style.overflow='';
}


/* ============================================================
   طباعة / حفظ PDF
   ============================================================ */

function printReport(){

  const overlay=
    $('#reportPreviewOverlay');

  if(!overlay){

    return toast(
      'افتح معاينة التقرير أولاً.',
      false
    )
  }

  document.body.classList.add(
    'report-printing'
  );

  setTimeout(()=>{

    window.print();

  },150);
}


/* ============================================================
   بعد إغلاق نافذة الطباعة
   ============================================================ */

window.addEventListener(
  'afterprint',
  ()=>{

    document.body.classList.remove(
      'report-printing'
    );

  }
);


/* ============================================================
   ESC لإغلاق معاينة التقرير
   ============================================================ */

document.addEventListener(
  'keydown',
  e=>{

    if(
      e.key==='Escape'&&
      $('#reportPreviewOverlay')
    ){

      closeReportPreview();

    }

  }
);


/* ============================================================
   Contact
   ============================================================ */

function renderContact(){

  let f = $('form');

  if(!f) return;

  f.onsubmit = async e => {

    e.preventDefault();

    let fields = $$(
      'input,textarea',
      f
    );

    let name = fields[0].value.trim();
    let email = fields[1].value.trim();
    let subject = fields[2].value.trim();
    let message = fields[3].value.trim();

    if(!name || !email || !subject || !message){
      toast('يرجى ملء جميع الحقول');
      return;
    }

    let btn = $('button[type="submit"]', f);

    if(btn){
      btn.disabled = true;
      btn.textContent = 'جاري الإرسال...';
    }

    try{

      let body = new URLSearchParams();

      body.append('name', name);
      body.append('email', email);
      body.append('subject', subject);
      body.append('message', message);

      let response = await fetch(
        'https://datalens.rf.gd/test-contact.php'
        {
          method:'POST',
          mode:'cors',
          body:body
        }
      );

      let text = await response.text();

      console.log('Contact API response:', text);

      toast(
  'تم الوصول إلى test-contact.php والرد هو: ' + text
);

return;
      
      let result;

      try{
        result = JSON.parse(text);
      }catch(parseError){

        console.error(
          'Invalid JSON response:',
          text
        );

        toast(
          'الخادم أرسل استجابة غير مفهومة'
        );

        return;
      }

      if(result.success){

        f.reset();

        toast(
          result.message ||
          'تم إرسال الرسالة بنجاح'
        );

      }else{

        toast(
          result.message ||
          'تعذر إرسال الرسالة'
        );

      }

    }catch(error){

  console.error(
    'Contact request error:',
    error
  );

  toast(
    'خطأ الاتصال: ' +
    (error.message || 'خطأ غير معروف')
  );

}finally{

      if(btn){

        btn.disabled = false;
        btn.textContent = 'إرسال الرسالة';

      }

    }

  };
}

/* ============================================================
   تشغيل النظام
   ============================================================ */

document.addEventListener(
  'DOMContentLoaded',
  ()=>{

    if(!guard())return;

    auth();

    shell();

    updateUploadInputs();

    uploads();

    render();
    renderContact();

  }
);

})();
