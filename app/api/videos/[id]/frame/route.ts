import { getCurrentStudent } from "@/lib/auth-server";
import { getVideo } from "@/lib/videos";

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}

const message = (title: string, text: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>html,body{margin:0;height:100%;background:#000;color:#9aa6c2;font-family:system-ui,sans-serif}.c{display:grid;place-items:center;height:100%;text-align:center;padding:1rem}</style></head><body><div class="c">${text}</div></body></html>`;

/**
 * Fully de-branded player. We use the YouTube IFrame API with controls=0 and
 * make the video layer non-interactive, then render our OWN controls and cover
 * every state where YouTube would show its logo / "Watch on YouTube" / title.
 * The YouTube id only lives in this server-served document (our domain).
 */
function player(youtubeId: string, title: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#wrap{height:100%;width:100%}
  body{background:#000;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;color:#fff}
  #wrap{position:relative;background:#000}
  /* YouTube iframe: fills the box but never receives pointer events */
  #player,#player iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  #player{pointer-events:none}
  /* transparent layer that owns all clicks (play/pause), so YouTube never does */
  #catch{position:absolute;inset:0;z-index:2;cursor:pointer}
  /* permanent opaque strip hiding YouTube's top title/channel byline + logo */
  #topmask{position:absolute;top:0;left:0;right:0;height:12%;min-height:48px;background:#000;z-index:3;pointer-events:none}
  /* opaque cover for unstarted/paused/ended states (hides all YT chrome) */
  #poster{position:absolute;inset:0;z-index:4;background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer}
  #poster.hide{display:none}
  #bigplay{width:74px;height:74px;border-radius:50%;border:0;background:rgba(109,94,252,.92);color:#fff;font-size:26px;cursor:pointer;display:grid;place-items:center;box-shadow:0 8px 30px rgba(109,94,252,.5);transition:transform .15s}
  #bigplay:hover{transform:scale(1.07)}
  /* our control bar */
  #bar{position:absolute;left:0;right:0;bottom:0;z-index:5;display:flex;align-items:center;gap:12px;padding:10px 14px 12px;background:linear-gradient(transparent,rgba(0,0,0,.75));transition:opacity .25s}
  #wrap.idle #bar{opacity:0}
  #wrap.idle #catch{cursor:none}
  .btn{background:none;border:0;color:#fff;cursor:pointer;font-size:18px;line-height:1;opacity:.92}
  .btn:hover{opacity:1}
  #seek{flex:1;height:14px;display:flex;align-items:center;cursor:pointer}
  #track{position:relative;width:100%;height:5px;border-radius:3px;background:rgba(255,255,255,.28)}
  #buffered{position:absolute;left:0;top:0;height:100%;border-radius:3px;background:rgba(255,255,255,.35);width:0}
  #played{position:absolute;left:0;top:0;height:100%;border-radius:3px;background:linear-gradient(90deg,#6d5efc,#22d3ee);width:0}
  #knob{position:absolute;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:#fff;left:0;box-shadow:0 1px 4px rgba(0,0,0,.5)}
  #time{font-size:12px;font-variant-numeric:tabular-nums;color:#e7ecf6;min-width:90px;text-align:center}
</style>
</head>
<body>
  <div id="wrap">
    <div id="player"></div>
    <div id="catch"></div>
    <div id="topmask"></div>
    <div id="poster"><button id="bigplay" aria-label="Play">&#9654;</button></div>
    <div id="bar">
      <button class="btn" id="play" aria-label="Play/Pause">&#9654;</button>
      <div id="seek"><div id="track"><div id="buffered"></div><div id="played"></div><div id="knob"></div></div></div>
      <span id="time">0:00 / 0:00</span>
      <button class="btn" id="mute" aria-label="Mute">&#128266;</button>
      <button class="btn" id="fs" aria-label="Fullscreen">&#9974;</button>
    </div>
  </div>
  <script>var CC_VIDEO=${JSON.stringify(youtubeId)};</script>
  <script>
  (function(){
    var player, dur=0, poll, ready=false;
    var $=function(id){return document.getElementById(id)};
    var wrap=$('wrap'), poster=$('poster'), topmask=$('topmask'), playBtn=$('play'),
        muteBtn=$('mute'), fsBtn=$('fs'), seek=$('seek'), played=$('played'),
        buffered=$('buffered'), knob=$('knob'), timeEl=$('time'), catchEl=$('catch'),
        bigplay=$('bigplay');

    function fmt(s){s=Math.max(0,Math.floor(s||0));var m=Math.floor(s/60),x=s%60;return m+':'+(x<10?'0':'')+x;}
    function showPoster(v){poster.classList.toggle('hide',!v);}

    // YouTube API loader
    var tag=document.createElement('script');
    tag.src='https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady=function(){
      player=new YT.Player('player',{
        videoId:CC_VIDEO,
        host:'https://www.youtube-nocookie.com',
        playerVars:{controls:0,modestbranding:1,rel:0,iv_load_policy:3,disablekb:1,playsinline:1,fs:0,showinfo:0,autoplay:0},
        events:{onReady:onReady,onStateChange:onState}
      });
    };

    function onReady(){ready=true;dur=player.getDuration()||0;}
    function onState(e){
      var S=YT.PlayerState;
      if(e.data===S.PLAYING){showPoster(false);setPlayIcon(true);startPoll();}
      else if(e.data===S.PAUSED){showPoster(true);setPlayIcon(false);stopPoll();}
      else if(e.data===S.ENDED){showPoster(true);setPlayIcon(false);stopPoll();try{player.seekTo(0,true);}catch(x){}}
      else if(e.data===S.BUFFERING){showPoster(false);}
    }
    function setPlayIcon(playing){var i=playing?'\\u275A\\u275A':'\\u25B6';playBtn.innerHTML=i;}

    function toggle(){if(!ready)return;var st=player.getPlayerState();if(st===1||st===3){player.pauseVideo();}else{player.playVideo();}}
    catchEl.addEventListener('click',toggle);
    bigplay.addEventListener('click',function(ev){ev.stopPropagation();if(ready)player.playVideo();});
    playBtn.addEventListener('click',toggle);

    muteBtn.addEventListener('click',function(){if(!ready)return;if(player.isMuted()){player.unMute();muteBtn.innerHTML='\\uD83D\\uDD0A';}else{player.mute();muteBtn.innerHTML='\\uD83D\\uDD07';}});

    fsBtn.addEventListener('click',function(){
      if(document.fullscreenElement){document.exitFullscreen();}
      else if(wrap.requestFullscreen){wrap.requestFullscreen();}
    });

    // Seeking
    seek.addEventListener('click',function(e){
      if(!ready||!dur)return;
      var r=seek.getBoundingClientRect();
      var frac=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));
      player.seekTo(frac*dur,true);updateBar();
    });

    function updateBar(){
      if(!ready)return;
      if(!dur)dur=player.getDuration()||0;
      var t=player.getCurrentTime()||0;
      var f=dur?t/dur:0;
      played.style.width=(f*100)+'%';knob.style.left=(f*100)+'%';
      var lf=player.getVideoLoadedFraction?player.getVideoLoadedFraction():0;
      buffered.style.width=(lf*100)+'%';
      timeEl.textContent=fmt(t)+' / '+fmt(dur);
    }
    function startPoll(){stopPoll();poll=setInterval(updateBar,250);}
    function stopPoll(){if(poll)clearInterval(poll);poll=null;}

    // Auto-hide controls when idle during playback
    var idleTimer;
    function activity(){wrap.classList.remove('idle');clearTimeout(idleTimer);idleTimer=setTimeout(function(){if(ready&&player.getPlayerState&&player.getPlayerState()===1)wrap.classList.add('idle');},2600);}
    wrap.addEventListener('mousemove',activity);
    wrap.addEventListener('click',activity);

    // No context menu anywhere (blocks "copy video URL")
    document.addEventListener('contextmenu',function(e){e.preventDefault();});
  })();
  </script>
</body>
</html>`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const student = await getCurrentStudent();
  if (!student) return html(message("Sign in", "Please log in to watch."), 401);

  const video = await getVideo(id);
  if (!video) return html(message("Not found", "Video not found."), 404);

  return html(player(video.youtubeId, video.title));
}
