const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rp=n=>'Rp'+Math.round(n||0).toLocaleString('id-ID');
const dk=iso=>new Date(iso).toLocaleDateString('en-CA');
const dt=iso=>new Date(iso).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const MASCOT='';
const K='berkah_db_v1',KS='berkah_session';
const IC={home:'M3 11l9-8 9 8M5 10v10h14V10',box:'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',tag:'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',alert:'M12 3l10 18H2zM12 10v5M12 18h.01',in:'M12 3v12m0 0l-4-4m4 4l4-4M4 17v4h16v-4',edit:'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',recv:'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6',out:'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',menu:'M3 6h18M3 12h18M3 18h18',moon:'M21 13A9 9 0 1111 3a7 7 0 0010 10z'};
const ico=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${IC[n]}"/></svg>`;
let db,me=null,S={};
function load(){try{const s=localStorage.getItem(K);if(s)return JSON.parse(s)}catch(e){}return seed()}
function save(){try{localStorage.setItem(K,JSON.stringify(db))}catch(e){}}
function mut(p,jenis,jml,o={}){const b=p.stok;p.stok+=jml;db.mutasi.push({id:++db.n,produk_id:p.id,jenis,jumlah:jml,stok_sebelum:b,stok_sesudah:p.stok,harga_beli:o.hb??null,transaksi_id:o.tid??null,catatan:o.cat||'',waktu:o.w||new Date().toISOString(),user_id:1})}
function sell(items,w,src){const t={id:++db.n,waktu:w,total:0,sumber:src,user_id:1};let n=db.transaksi.length+1;t.kode='TRX-'+dk(w).replace(/-/g,'')+'-'+String(n).padStart(3,'0');
 for(const [pid,q] of items){const p=db.produk.find(x=>x.id===pid);if(!p||p.stok<q)continue;const sub=p.harga*q;t.total+=sub;db.detail.push({id:++db.n,transaksi_id:t.id,produk_id:p.id,nama_produk:p.nama,harga_satuan:p.harga,jumlah:q,subtotal:sub});mut(p,'jual',-q,{tid:t.id,w})}
 if(!t.total)return;t.uang_diterima=Math.ceil(t.total/5000)*5000;t.kembalian=t.uang_diterima-t.total;db.transaksi.push(t)}
function seed(){const iso=new Date().toISOString();db={n:0,users:[{id:1,nama:'Berkah',email:'berkah@gmail.com',pw:btoa('berkah123'),created_at:iso}],kategori:[],produk:[],transaksi:[],detail:[],mutasi:[]};
 ['Makanan','Minuman','Sembako','Kebersihan'].forEach(n=>db.kategori.push({id:++db.n,nama:n,created_at:iso}));
 const P=[['Indomie Goreng 85g',1,'8998866200318',3500,2900,60,20],['Chitato Sapi Panggang 68g',1,'8992775001019',11500,9800,18,10],['Roti Tawar Sari Roti',1,'8997001230012',16000,13500,9,10],['Teh Botol Sosro 450ml',2,'8886001010011',5500,4300,48,24],['Aqua 600ml',2,'8886008101053',4000,3100,72,24],['Kopi Kapal Api Sachet',2,'8992761111014',1500,1150,100,30],['Beras Pandan Wangi 5kg',3,'8993000500050',72000,66000,14,5],['Gula Pasir 1kg',3,'8993000100011',17500,15500,6,8],['Minyak Goreng Bimoli 1L',3,'8992000001231',19500,17200,22,10],['Telur Ayam 1kg',3,'2000000000017',29000,26500,12,6],['Rinso Cair 800ml',4,'8999999032111',23500,20500,16,6],['Sabun Lifebuoy 75g',4,'8999999051013',3500,2700,30,12]];
 const t0=Date.now()-8*864e5;P.forEach(([nama,k,barcode,harga,hb,st,mn])=>{const p={id:++db.n,nama,kategori_id:k,barcode,harga,harga_beli:hb,stok:0,stok_minimum:mn,created_at:iso,updated_at:iso};db.produk.push(p);mut(p,'masuk',st+40,{hb,cat:'Stok awal',w:new Date(t0).toISOString()})});
 let r=7;const rnd=()=>(r=(r*9301+49297)%233280)/233280;
 for(let d=7;d>=0;d--)for(let i=0;i<2+Math.floor(rnd()*3);i++){const w=new Date(Date.now()-d*864e5);w.setHours(8+Math.floor(rnd()*11),Math.floor(rnd()*60));
  const it=[];for(let j=0;j<1+Math.floor(rnd()*4);j++)it.push([2+Math.floor(rnd()*12),1+Math.floor(rnd()*4)]);sell(it,w.toISOString(),['desktop','desktop','android'][Math.floor(rnd()*3)])}
 [[3,-12,'Roti kedaluwarsa dibuang'],[8,-36,'Selisih stok opname']].forEach(([id,j,c])=>{const p=db.produk.find(x=>x.id===id+4);if(p&&p.stok+j>=0)mut(p,'penyesuaian',j,{cat:c})});
 save();return db}
const prod=id=>db.produk.find(x=>x.id==id),kat=id=>db.kategori.find(x=>x.id==id);
const low=()=>db.produk.filter(p=>p.stok<=p.stok_minimum);
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),2400)}
function modal(title,body,label,fn){$('#ov').innerHTML=`<div class="ov"><form class="md"><div class="ch"><h3>${title}</h3><button type="button" class="btn sm" data-act="x">Tutup</button></div><div class="cb">${body}<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">${label?`<button type="button" class="btn" data-act="x">Batal</button><button class="btn bp">${label}</button>`:''}</div></div></form></div>`;
 const f=$('#ov form');f.onsubmit=e=>{e.preventDefault();if(fn&&fn(Object.fromEntries(new FormData(f)))!==false)$('#ov').innerHTML=''};const i=$('input,select',f);i&&i.focus()}
const ask=(m,fn)=>modal('Konfirmasi',`<p>${m}</p>`,'Ya, lanjutkan',()=>{fn()});
const opts=(arr,sel,k='nama')=>arr.map(x=>`<option value="${x.id}" ${x.id==sel?'selected':''}>${esc(x[k])}</option>`).join('');
const popt=sel=>db.produk.map(p=>`<option value="${p.id}" ${p.id==sel?'selected':''}>${esc(p.nama)} (stok ${p.stok})</option>`).join('');
const today=()=>dk(new Date().toISOString());
const jb={jual:['r','Terjual'],masuk:['g','Barang masuk'],penyesuaian:['o','Penyesuaian']};
const empty=(t,s)=>`<div class="em"><h4>${t}</h4><p>${s}</p></div>`;

const PG={
dashboard:{t:'Dashboard',s:'Ringkasan toko hari ini',html(){const td=today(),tr=db.transaksi.filter(t=>dk(t.waktu)===td),L=low();
 const days=[...Array(7)].map((_,i)=>{const d=new Date(Date.now()-(6-i)*864e5),k=dk(d.toISOString());return{l:d.toLocaleDateString('id-ID',{weekday:'short'}),v:db.transaksi.filter(t=>dk(t.waktu)===k).reduce((a,t)=>a+t.total,0)}}),mx=Math.max(...days.map(d=>d.v),1);
 const bars=days.map((d,i)=>{const h=d.v/mx*150;return`<rect x="${i*60+14}" y="${170-h}" width="34" height="${h}" rx="4" fill="#3DB5FF"><title>${rp(d.v)}</title></rect><text x="${i*60+31}" y="190" text-anchor="middle" font-size="12" fill="currentColor">${d.l}</text>`}).join('');
 const rec=[...db.transaksi].reverse().slice(0,5);
 return`<div class="ban"><span><b>Selamat datang, ${esc(me.nama)}</b><br>${L.length?`Ada ${L.length} barang yang stoknya menipis dan perlu dibeli ulang.`:'Semua stok barang masih aman.'}</span><a class="btn bp" href="#barang-masuk">Catat barang masuk</a></div>
 <div class="stats"><div class="st lt" style="background:#3DB5FF"><span>Penjualan hari ini</span><h3>${rp(tr.reduce((a,t)=>a+t.total,0))}</h3></div><div class="st" style="background:#092C4C"><span>Transaksi hari ini</span><h3>${tr.length}</h3></div><div class="st" style="background:#0E9384"><span>Jumlah produk</span><h3>${db.produk.length}</h3></div><div class="st" style="background:#E04F16"><span>Stok menipis</span><h3>${L.length}</h3></div></div>
 <div class="g2"><div class="card"><div class="ch"><h4>Penjualan 7 hari terakhir</h4></div><div class="cb"><svg viewBox="0 0 420 200" width="100%" role="img" aria-label="Grafik penjualan 7 hari">${bars}</svg></div></div>
 <div class="card"><div class="ch"><h4>Stok menipis</h4><a href="#stok-menipis" class="btn sm">Lihat semua</a></div><div class="cb">${L.slice(0,5).map(p=>`<div class="li"><span>${esc(p.nama)}</span><span class="b r">${p.stok}</span></div>`).join('')||empty('Aman','Tidak ada barang yang menipis.')}</div></div></div>
 <div class="card"><div class="ch"><h4>Transaksi terbaru</h4><a href="#transaksi" class="btn sm">Lihat semua</a></div><div class="tw"><table><tr><th>Kode</th><th>Waktu</th><th>Sumber</th><th class="r">Total</th></tr>${rec.map(t=>`<tr><td>${t.kode}</td><td>${dt(t.waktu)}</td><td><span class="b n">${t.sumber}</span></td><td class="r">${rp(t.total)}</td></tr>`).join('')}</table></div></div>`}},

produk:{t:'Produk',s:'Kelola data produk dan barcode',act:'<button class="btn bp" data-act="addp">+ Tambah produk</button>',
 html(){return`<div class="card"><div class="ch"><div class="flt"><input id="q" placeholder="Cari nama atau barcode" value="${esc(S.q||'')}"><select id="fk"><option value="">Semua kategori</option>${opts(db.kategori,S.fk)}</select></div><span>${db.produk.length} produk</span></div><div class="tw" id="tb">${this.tbl()}</div></div>`},
 tbl(){const q=(S.q||'').toLowerCase(),r=db.produk.filter(p=>(!q||p.nama.toLowerCase().includes(q)||p.barcode.includes(q))&&(!S.fk||p.kategori_id==S.fk));
  return r.length?`<table><tr><th>Produk</th><th>Barcode</th><th>Kategori</th><th class="r">Harga jual</th><th class="r">Harga beli</th><th class="r">Stok</th><th class="r">Min.</th><th></th></tr>${r.map(p=>`<tr><td><b style="color:var(--hd)">${esc(p.nama)}</b></td><td>${esc(p.barcode)}</td><td>${esc(kat(p.kategori_id)?.nama||'-')}</td><td class="r">${rp(p.harga)}</td><td class="r">${rp(p.harga_beli)}</td><td class="r"><span class="b ${p.stok<=p.stok_minimum?'r':'g'}">${p.stok}</span></td><td class="r">${p.stok_minimum}</td><td class="r" style="white-space:nowrap"><button class="btn sm" data-act="editp" data-id="${p.id}">Ubah</button> <button class="btn sm bd" data-act="delp" data-id="${p.id}">Hapus</button></td></tr>`).join('')}</table>`:empty('Produk tidak ditemukan','Ubah kata kunci atau tambah produk baru.')}},

kategori:{t:'Kategori',s:'Kelompokkan produk berdasarkan kategori',act:'<button class="btn bp" data-act="addk">+ Tambah kategori</button>',
 html(){return`<div class="card"><div class="tw">${db.kategori.length?`<table><tr><th>Kategori</th><th>Jumlah produk</th><th>Produk</th><th></th></tr>${db.kategori.map(k=>{const ps=db.produk.filter(p=>p.kategori_id===k.id);return`<tr><td><b style="color:var(--hd)">${esc(k.nama)}</b></td><td><span class="b s">${ps.length}</span></td><td>${esc(ps.map(p=>p.nama).join(', ')||'-')}</td><td class="r" style="white-space:nowrap"><button class="btn sm" data-act="editk" data-id="${k.id}">Ubah</button> <button class="btn sm bd" data-act="delk" data-id="${k.id}">Hapus</button></td></tr>`}).join('')}</table>`:empty('Belum ada kategori','Tambah kategori untuk mengelompokkan produk.')}</div></div>`}},

'barang-masuk':{t:'Barang masuk',s:'Catat restock, stok bertambah otomatis',
 html(){const m=db.mutasi.filter(x=>x.jenis==='masuk').reverse().slice(0,15);return`<div class="g2"><div class="card"><div class="ch"><h4>Riwayat barang masuk</h4></div><div class="tw">${m.length?`<table><tr><th>Tanggal</th><th>Produk</th><th class="r">Jumlah</th><th class="r">Harga beli</th></tr>${m.map(x=>`<tr><td>${dt(x.waktu)}</td><td>${esc(prod(x.produk_id)?.nama)}</td><td class="r pos">+${x.jumlah}</td><td class="r">${rp(x.harga_beli)}</td></tr>`).join('')}</table>`:empty('Belum ada','Catat barang masuk pertama.')}</div></div>
 <div class="card"><div class="ch"><h4>Catat barang masuk</h4></div><form class="cb" id="fm"><div class="fg"><label>Produk</label><select name="pid" required>${popt()}</select></div><div class="row"><div class="fg"><label>Jumlah</label><input name="jml" type="number" min="1" required></div><div class="fg"><label>Harga beli (Rp)</label><input name="hb" type="number" min="0" required></div></div><div class="fg"><label>Tanggal</label><input name="tgl" type="date" value="${today()}" required></div><button class="btn bp" style="width:100%">Simpan barang masuk</button></form></div></div>`}},

opname:{t:'Penyesuaian stok',s:'Koreksi stok bila ada selisih, barang rusak, atau hilang',
 html(){const m=db.mutasi.filter(x=>x.jenis==='penyesuaian').reverse().slice(0,15);return`<div class="g2"><div class="card"><div class="ch"><h4>Riwayat penyesuaian</h4></div><div class="tw">${m.length?`<table><tr><th>Tanggal</th><th>Produk</th><th class="r">Perubahan</th><th>Alasan</th></tr>${m.map(x=>`<tr><td>${dt(x.waktu)}</td><td>${esc(prod(x.produk_id)?.nama)}</td><td class="r ${x.jumlah<0?'neg':'pos'}">${x.jumlah>0?'+':''}${x.jumlah}</td><td>${esc(x.catatan)}</td></tr>`).join('')}</table>`:empty('Belum ada penyesuaian','Gunakan form untuk mengoreksi stok.')}</div></div>
 <div class="card"><div class="ch"><h4>Koreksi stok</h4></div><form class="cb" id="fo"><div class="fg"><label>Produk</label><select name="pid" required>${popt()}</select></div><div class="fg"><label>Stok sebenarnya di rak</label><input name="real" type="number" min="0" required></div><div class="fg"><label>Alasan (wajib)</label><textarea name="cat" rows="3" required placeholder="Contoh: barang rusak, hilang, selisih hitung"></textarea></div><button class="btn bp" style="width:100%">Simpan penyesuaian</button></form></div></div>`}},

mutasi:{t:'Riwayat stok',s:'Semua perubahan stok: terjual, barang masuk, penyesuaian',
 html(){return`<div class="card"><div class="ch"><div class="flt"><select id="fp"><option value="">Semua produk</option>${opts(db.produk,S.fp)}</select><input type="date" id="f1" value="${S.f1||''}" aria-label="Dari tanggal"><input type="date" id="f2" value="${S.f2||''}" aria-label="Sampai tanggal"></div></div><div class="tw" id="tb">${this.tbl()}</div></div>`},
 tbl(){const r=db.mutasi.filter(x=>(!S.fp||x.produk_id==S.fp)&&(!S.f1||dk(x.waktu)>=S.f1)&&(!S.f2||dk(x.waktu)<=S.f2)).reverse().slice(0,200);
  return r.length?`<table><tr><th>Waktu</th><th>Produk</th><th>Jenis</th><th class="r">Jumlah</th><th class="r">Sebelum</th><th class="r">Sesudah</th><th>Catatan</th></tr>${r.map(x=>`<tr><td>${dt(x.waktu)}</td><td>${esc(prod(x.produk_id)?.nama)}</td><td><span class="b ${jb[x.jenis][0]}">${jb[x.jenis][1]}</span></td><td class="r ${x.jumlah<0?'neg':'pos'}">${x.jumlah>0?'+':''}${x.jumlah}</td><td class="r">${x.stok_sebelum}</td><td class="r">${x.stok_sesudah}</td><td>${esc(x.catatan||(x.transaksi_id?db.transaksi.find(t=>t.id===x.transaksi_id)?.kode:''))}</td></tr>`).join('')}</table>`:empty('Tidak ada data','Coba ubah filter produk atau tanggal.')}},

'stok-menipis':{t:'Stok menipis',s:'Barang dengan stok sama dengan atau di bawah stok minimum',
 html(){const L=low();return`<div class="card"><div class="tw">${L.length?`<table><tr><th>Produk</th><th>Kategori</th><th class="r">Stok</th><th class="r">Stok minimum</th><th>Status</th><th></th></tr>${L.map(p=>`<tr><td><b style="color:var(--hd)">${esc(p.nama)}</b></td><td>${esc(kat(p.kategori_id)?.nama||'-')}</td><td class="r">${p.stok}</td><td class="r">${p.stok_minimum}</td><td><span class="b ${p.stok===0?'r':'o'}">${p.stok===0?'Habis':'Menipis'}</span></td><td class="r"><a class="btn sm bp" href="#barang-masuk">Restock</a></td></tr>`).join('')}</table>`:empty('Semua stok aman','Tidak ada barang di bawah stok minimum.')}</div></div>`}},

transaksi:{t:'Riwayat transaksi',s:'Daftar penjualan dengan filter tanggal',
 html(){return`<div class="card"><div class="ch"><div class="flt"><input type="date" id="f1" value="${S.f1||''}" aria-label="Dari tanggal"><input type="date" id="f2" value="${S.f2||''}" aria-label="Sampai tanggal"></div><b id="sum" style="color:var(--hd)"></b></div><div class="tw" id="tb">${this.tbl()}</div></div>`},
 tbl(){const r=db.transaksi.filter(t=>(!S.f1||dk(t.waktu)>=S.f1)&&(!S.f2||dk(t.waktu)<=S.f2)).reverse();
  setTimeout(()=>{const e=$('#sum');if(e)e.textContent=r.length+' transaksi · '+rp(r.reduce((a,t)=>a+t.total,0))});
  return r.length?`<table><tr><th>Kode</th><th>Waktu</th><th>Sumber</th><th class="r">Total</th><th class="r">Diterima</th><th class="r">Kembalian</th><th></th></tr>${r.map(t=>`<tr><td>${t.kode}</td><td>${dt(t.waktu)}</td><td><span class="b n">${t.sumber}</span></td><td class="r">${rp(t.total)}</td><td class="r">${rp(t.uang_diterima)}</td><td class="r">${rp(t.kembalian)}</td><td class="r"><button class="btn sm" data-act="det" data-id="${t.id}">Detail</button></td></tr>`).join('')}</table>`:empty('Tidak ada transaksi','Coba ubah rentang tanggal.')}}
};
const NAV=[['Utama',[['dashboard','home','Dashboard']]],['Inventori',[['produk','box','Produk'],['kategori','tag','Kategori'],['stok-menipis','alert','Stok menipis']]],['Stok',[['barang-masuk','in','Barang masuk'],['opname','edit','Penyesuaian stok'],['mutasi','list','Riwayat stok']]],['Penjualan',[['transaksi','recv','Riwayat transaksi']]]];
const cur=()=>(location.hash.slice(1)in PG?location.hash.slice(1):'dashboard');

function shell(){const k=cur(),p=PG[k];$('#app').innerHTML=`<aside class="side" id="sd"><div class="logo"><i>B</i><span class="nm">Toko Berkah</span><button class="sbt" data-act="collapse" aria-label="Ciutkan atau lebarkan menu">${ico('menu')}</button></div>${NAV.map(([g,it])=>`<div class="grp">${g}</div>`+it.map(([id,ic,l])=>`<a class="nav ${id===k?'on':''}" href="#${id}" title="${l}">${ico(ic)}<span class="ln">${l}</span>${id==='stok-menipis'&&low().length?`<span class="b r" style="margin-left:auto">${low().length}</span>`:''}</a>`).join('')).join('')}</aside>
<div class="main"><header class="top"><button class="ic" id="burger" data-act="menu" aria-label="Menu">${ico('menu')}</button><span class="sp"></span><button class="ic" data-act="theme" aria-label="Ganti tema">${themeIcon()}</button><div class="av"><b>${esc(me.nama[0])}</b><span>${esc(me.nama)}</span></div><button class="ic" data-act="logout" aria-label="Keluar" title="Keluar">${ico('out')}</button></header>
<main class="pg"><div class="ph"><div><h2>${p.t}</h2><p>${p.s}</p></div><div>${p.act||''}</div></div>${p.html()}</main></div>`;bind()}
function bind(){const k=cur();$('#q')&&($('#q').oninput=e=>{S.q=e.target.value;$('#tb').innerHTML=PG[k].tbl()});
 ['fk','fp','f1','f2'].forEach(i=>{const e=$('#'+i);if(e)e.onchange=ev=>{S[i]=ev.target.value;$('#tb').innerHTML=PG[k].tbl()}});
 const fm=$('#fm');if(fm){const sel=$('select',fm),hb=$('[name=hb]',fm);sel.onchange=()=>hb.value=prod(sel.value).harga_beli;sel.onchange();
  fm.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(fm)),p=prod(d.pid);mut(p,'masuk',+d.jml,{hb:+d.hb,w:new Date(d.tgl+'T'+new Date().toTimeString().slice(0,8)).toISOString(),cat:'Barang masuk'});p.harga_beli=+d.hb;p.updated_at=new Date().toISOString();save();toast('Stok '+p.nama+' bertambah '+d.jml);shell()}}
 const fo=$('#fo');if(fo)fo.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(fo)),p=prod(d.pid),sel=+d.real-p.stok;if(!d.cat.trim())return toast('Alasan wajib diisi');if(!sel)return toast('Stok sudah sama, tidak ada perubahan');mut(p,'penyesuaian',sel,{cat:d.cat.trim()});save();toast('Stok disesuaikan');shell()}}

function pform(p={}){return`<div class="fg"><label>Nama produk</label><input name="nama" required value="${esc(p.nama)}"></div><div class="row"><div class="fg"><label>Barcode</label><input name="barcode" required value="${esc(p.barcode)}"></div><div class="fg"><label>Kategori</label><select name="kategori_id"><option value="">Tanpa kategori</option>${opts(db.kategori,p.kategori_id)}</select></div></div><div class="row"><div class="fg"><label>Harga jual (Rp)</label><input name="harga" type="number" min="0" required value="${p.harga??''}"></div><div class="fg"><label>Harga beli (Rp)</label><input name="harga_beli" type="number" min="0" required value="${p.harga_beli??''}"></div></div><div class="row">${p.id?'':`<div class="fg"><label>Stok awal</label><input name="stok" type="number" min="0" required value="0"></div>`}<div class="fg"><label>Stok minimum</label><input name="stok_minimum" type="number" min="0" required value="${p.stok_minimum??5}"></div></div>`}
function saveP(d,p){if(db.produk.some(x=>x.barcode===d.barcode.trim()&&x.id!==p?.id)){toast('Barcode sudah dipakai produk lain');return false}
 const v={nama:d.nama.trim(),barcode:d.barcode.trim(),kategori_id:d.kategori_id?+d.kategori_id:null,harga:+d.harga,harga_beli:+d.harga_beli,stok_minimum:+d.stok_minimum,updated_at:new Date().toISOString()};
 if(p)Object.assign(p,v);else{const n={id:++db.n,stok:0,created_at:v.updated_at,...v};db.produk.push(n);if(+d.stok>0)mut(n,'masuk',+d.stok,{hb:n.harga_beli,cat:'Stok awal'})}
 save();toast('Produk disimpan');shell()}
function kform(k){modal(k?'Ubah kategori':'Tambah kategori',`<div class="fg"><label>Nama kategori</label><input name="nama" required value="${esc(k?.nama)}"></div>`,'Simpan',d=>{const n=d.nama.trim();if(db.kategori.some(x=>x.nama.toLowerCase()===n.toLowerCase()&&x.id!==k?.id)){toast('Nama kategori sudah ada');return false}
 if(k)k.nama=n;else db.kategori.push({id:++db.n,nama:n,created_at:new Date().toISOString()});save();toast('Kategori disimpan');shell()})}

document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=+b.dataset.id;
 if(a==='x')$('#ov').innerHTML='';
 else if(a==='menu')$('#sd').classList.toggle('open');
 else if(a==='collapse')sb(!document.documentElement.classList.contains('sbmin'))
 else if(a==='theme'){const nt=document.documentElement.dataset.theme==='dark'?'light':'dark';b.classList.add('spin');setTimeout(()=>b.classList.remove('spin'),700);
  if(!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches){theme(nt);b.innerHTML=themeIcon();}else{const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,R=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
   document.startViewTransition(()=>{theme(nt);b.innerHTML=themeIcon();}).ready.then(()=>document.documentElement.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${R}px at ${x}px ${y}px)`]},{duration:700,easing:'cubic-bezier(.4,0,.2,1)',pseudoElement:'::view-transition-new(root)'})).catch(()=>{})}}
 else if(a==='logout'){me=null;try{localStorage.removeItem(KS)}catch(e){}route()}
 else if(a==='addp')modal('Tambah produk',pform(),'Simpan',d=>saveP(d));
 else if(a==='editp'){const p=prod(id);modal('Ubah produk',pform(p),'Simpan',d=>saveP(d,p))}
 else if(a==='delp'){const p=prod(id);ask(`Hapus produk <b>${esc(p.nama)}</b>? Riwayat transaksi tetap tersimpan.`,()=>{db.produk=db.produk.filter(x=>x.id!==id);save();toast('Produk dihapus');shell()})}
 else if(a==='addk')kform();else if(a==='editk')kform(kat(id));
 else if(a==='delk'){const k=kat(id);ask(`Hapus kategori <b>${esc(k.nama)}</b>? Produk di dalamnya menjadi tanpa kategori.`,()=>{db.produk.forEach(p=>{if(p.kategori_id===id)p.kategori_id=null});db.kategori=db.kategori.filter(x=>x.id!==id);save();toast('Kategori dihapus');shell()})}
 else if(a==='det'){const t=db.transaksi.find(x=>x.id===id);modal(t.kode,`<p>${dt(t.waktu)} · <span class="b n">${t.sumber}</span></p><div class="tw"><table style="min-width:0"><tr><th>Item</th><th class="r">Harga</th><th class="r">Qty</th><th class="r">Subtotal</th></tr>${db.detail.filter(d=>d.transaksi_id===id).map(d=>`<tr><td>${esc(d.nama_produk)}</td><td class="r">${rp(d.harga_satuan)}</td><td class="r">${d.jumlah}</td><td class="r">${rp(d.subtotal)}</td></tr>`).join('')}</table></div><div class="li"><span>Total</span><b>${rp(t.total)}</b></div><div class="li"><span>Uang diterima</span><span>${rp(t.uang_diterima)}</span></div><div class="li"><span>Kembalian</span><span>${rp(t.kembalian)}</span></div>`)}});

Object.assign(IC,{mail:'M3 5h18v14H3zM3 7l9 6 9-6',lock:'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6',sun:'M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M6.343 6.343L4.929 4.929m12.728 0l-1.414 1.414M6.343 17.657l-1.414 1.414M12 7a5 5 0 100 10 5 5 0 000-10z'});
function themeIcon(){return document.documentElement.dataset.theme==='dark'?ico('sun'):ico('moon')}
function auth(){$('#app').innerHTML=`<div class="lg"><button type="button" class="ic lg-th" data-act="theme" aria-label="Ganti tema">${themeIcon()}</button><div class="lg-c"><form class="lg-card" id="af" novalidate><h2 class="lg-t">Masuk</h2><p class="lg-s">Toko Berkah · kelola stok dan penjualan</p><div class="lg-al" id="al" role="alert" hidden></div>
<div class="lg-f"><label class="lg-l" for="em">${ico('mail')}Surel</label><div class="lg-w" id="w1"><span class="lg-i">${ico('mail')}</span><input id="em" name="email" type="email" autocomplete="username" placeholder="surel@contoh.com" value="berkah@gmail.com"></div></div>
<div class="lg-f"><label class="lg-l" for="pw">${ico('lock')}Kata sandi</label><div class="lg-w" id="w2"><span class="lg-i">${ico('lock')}</span><input id="pw" name="pw" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi" value="berkah123"><button type="button" class="lg-eye" id="eye" aria-label="Tampilkan kata sandi">${ico('eye')}</button></div></div>
<button class="lg-b">Masuk</button></form></div></div>`;
 $('#eye').onclick=()=>{const i=$('#pw');i.type=i.type==='password'?'text':'password'};
 $('#af').onsubmit=e=>{e.preventDefault();const em=$('#em').value.trim().toLowerCase(),pw=$('#pw').value,al=$('#al');
  $('#w1').classList.toggle('bad',!em);$('#w2').classList.toggle('bad',!pw);
  const err=m=>{al.textContent=m;al.hidden=false};
  if(!em||!pw)return err('Surel dan kata sandi wajib diisi');
  me=db.users.find(u=>u.email===em&&u.pw===btoa(pw));if(!me)return err('Surel atau kata sandi salah');
  try{localStorage.setItem(KS,me.id)}catch(e){}location.hash='#dashboard';route()}}
function route(){if(!me){auth(false);return}shell();window.scrollTo(0,0)}
function sb(v){document.documentElement.classList.toggle('sbmin',v);try{localStorage.setItem('berkah_sb',v?'1':'0')}catch(e){}}
try{sb(innerWidth<992||localStorage.getItem('berkah_sb')!=='0')}catch(e){sb(true)}
function theme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('berkah_theme',t)}catch(e){}}
try{theme(localStorage.getItem('berkah_theme')||'light')}catch(e){theme('light')}
db=load();try{const s=localStorage.getItem(KS);me=db.users.find(u=>u.id==s)||null}catch(e){}
addEventListener('hashchange',()=>{S={};if(innerWidth<992)sb(true);route()});route();

// --- Liquid Glass Particles Animation ---
(function initParticles(){
  const container=$('#particles');
  if(!container)return;
  
  // Create 5 floating particles
  for(let i=0;i<5;i++){
    const p=document.createElement('div');
    p.className='particle';
    p.style.animationDelay=i*3+'s';
    container.appendChild(p);
  }
  
  // Add random movement with mouse interaction
  document.addEventListener('mousemove',e=>{
    const particles=$$('.particle',container);
    particles.forEach((p,idx)=>{
      const x=(e.clientX/window.innerWidth-0.5)*20*(idx+1);
      const y=(e.clientY/window.innerHeight-0.5)*20*(idx+1);
      p.style.transform=`translate(${x}px,${y}px)`;
    });
  });
})();
