import { 
  collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, getDoc 
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

const db = window.__FIRESTORE__;

// Map init (Tokyo view)
const map = L.map('map', { zoomControl: true }).setView([35.681236, 139.767125], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const markers = new Map(); // id -> marker

// UI elements
const addDialog = document.getElementById('addDialog');
const btnAdd = document.getElementById('btnAdd');
const btnLocate = document.getElementById('btnLocate');
const btnShare = document.getElementById('btnShare');
const spotName = document.getElementById('spotName');
const spotTags = document.getElementById('spotTags');
const spotDiff = document.getElementById('spotDiff');
const spotNote = document.getElementById('spotNote');
const latPreview = document.getElementById('latPreview');
const lngPreview = document.getElementById('lngPreview');
const btnUseCenter = document.getElementById('useCenter');
const btnSaveSpot = document.getElementById('saveSpot');

let pendingLatLng = null;

// Long-press to set pendingLatLng
let pressTimer = null;
map.on('mousedown', (e) => {
  pressTimer = setTimeout(() => {
    pendingLatLng = e.latlng;
    updateCoordPreview();
    L.popup().setLatLng(e.latlng).setContent('ここに追加します（ダイアログで保存）').openOn(map);
    if (!addDialog.open) addDialog.showModal();
  }, 500);
});
map.on('mouseup dragstart move', () => clearTimeout(pressTimer));

function updateCoordPreview() {
  if (pendingLatLng) {
    latPreview.textContent = pendingLatLng.lat.toFixed(6);
    lngPreview.textContent = pendingLatLng.lng.toFixed(6);
  } else {
    latPreview.textContent = '-'; lngPreview.textContent = '-';
  }
}

btnUseCenter.addEventListener('click', () => {
  pendingLatLng = map.getCenter();
  updateCoordPreview();
});

btnAdd.addEventListener('click', () => {
  pendingLatLng = map.getCenter();
  updateCoordPreview();
  addDialog.showModal();
});

btnSaveSpot.addEventListener('click', async (ev) => {
  // form method=dialogなので自動close。ここで保存処理。
  ev.preventDefault();
  try {
    const name = spotName.value.trim();
    if (!name) return;
    const tags = spotTags.value.split(',').map(s => s.trim()).filter(Boolean);
    const diff = spotDiff.value || '';
    const note = spotNote.value.trim();
    const latlng = pendingLatLng || map.getCenter();

    const ref = await addDoc(collection(db, 'spots'), {
      name, tags, difficulty: diff, note,
      lat: latlng.lat, lng: latlng.lng,
      created_at: serverTimestamp()
    });

    // 共有誘導
    const url = new URL(window.location.href);
    url.searchParams.set('spot', ref.id);
    if (navigator.share) {
      await navigator.share({ title: name, text: 'パルクール・スポットを共有', url: url.toString() });
    } else {
      await navigator.clipboard.writeText(url.toString());
      alert('リンクをコピーしました！\n' + url.toString());
    }

    // reset
    spotName.value = ''; spotTags.value = ''; spotDiff.value = ''; spotNote.value = '';
    pendingLatLng = null; updateCoordPreview();
    addDialog.close();
  } catch (e) {
    console.error(e);
    alert('保存に失敗しました。設定を確認してください。');
  }
});

btnLocate.addEventListener('click', () => {
  if (!navigator.geolocation) { alert('位置情報を取得できません'); return; }
  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude, longitude } = pos.coords;
    map.setView([latitude, longitude], 15);
    L.circleMarker([latitude, longitude], { radius: 6 }).addTo(map).bindPopup('現在地').openPopup();
  }, () => alert('位置情報を取得できませんでした'));
});

btnShare.addEventListener('click', async () => {
  // 現在のビューを共有（中心点とズーム）
  const c = map.getCenter();
  const z = map.getZoom();
  const url = new URL(window.location.href);
  url.searchParams.set('lat', c.lat.toFixed(6));
  url.searchParams.set('lng', c.lng.toFixed(6));
  url.searchParams.set('z', z);
  try {
    if (navigator.share) await navigator.share({ title: 'Parkour Spots', url: url.toString() });
    else {
      await navigator.clipboard.writeText(url.toString());
      alert('リンクをコピーしました！\n' + url.toString());
    }
  } catch {}
});

// Restore view or focus a spot from URL params
(function restoreFromURL(){
  const url = new URL(window.location.href);
  const lat = parseFloat(url.searchParams.get('lat'));
  const lng = parseFloat(url.searchParams.get('lng'));
  const z = parseInt(url.searchParams.get('z'), 10);
  if (!isNaN(lat) && !isNaN(lng)) map.setView([lat, lng], isNaN(z)? 14 : z);

  const spotId = url.searchParams.get('spot');
  if (spotId) {
    // After markers load, open the one with this id
    const int = setInterval(() => {
      if (markers.has(spotId)) {
        const m = markers.get(spotId);
        m.openPopup(); clearInterval(int);
      }
    }, 300);
    setTimeout(() => clearInterval(int), 8000);
  }
})();

// Render a Firestore spot into marker+popup
function renderSpot(id, data) {
  const { name, tags=[], difficulty='', note='', lat, lng } = data;
  if (typeof lat !== 'number' || typeof lng !== 'number') return;
  let marker = markers.get(id);
  const html = document.getElementById('popupTemplate').content.cloneNode(true);
  html.querySelector('.popup-title').textContent = name || '名称未設定';
  const tagStr = (tags && tags.length)? tags.join(', ') : 'タグなし';
  const meta = [difficulty || '難易度未設定', tagStr].filter(Boolean).join(' / ');
  html.querySelector('.popup-meta').textContent = meta;
  html.querySelector('.popup-note').textContent = note || '';

  const shareBtn = html.querySelector('.share-spot');
  shareBtn.addEventListener('click', async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('spot', id);
    const link = url.toString();
    try {
      if (navigator.share) await navigator.share({ title: name, text: 'パルクール・スポット', url: link });
      else { await navigator.clipboard.writeText(link); alert('リンクをコピーしました！\n' + link); }
    } catch {}
  });

  html.querySelector('.report-spot').addEventListener('click', () => {
    alert('通報ありがとうございます。現時点では簡易版のため、管理者に通知は飛びません。今後、審査機能を追加予定です。');
  });

  if (!marker) {
    marker = L.marker([lat, lng]).addTo(map);
    markers.set(id, marker);
  }
  marker.bindPopup(html);
}

// Live updates
const q = query(collection(db, 'spots'), orderBy('created_at', 'desc'));
onSnapshot(q, (snap) => {
  snap.docChanges().forEach((ch) => {
    const id = ch.doc.id;
    const data = ch.doc.data();
    if (ch.type === 'added' || ch.type === 'modified') renderSpot(id, data);
    if (ch.type === 'removed') {
      const m = markers.get(id);
      if (m) { m.remove(); markers.delete(id); }
    }
  });
});
