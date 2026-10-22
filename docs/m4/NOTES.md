# Catatan M4 (suara + juice + balance)

## M4 Juice + momen wow (22 Okt)
GIF:
- `docs/m4/m4-wow.gif`: senja, lampu dimatiin, Dot nyala, ruangan meredup, kamera mendekat, cahaya hangat nerangin toples, kilauan sama hati keluar dari Dot, terus kartu pos Hazel.
- `docs/m4/m4-juice.gif`: tutup dibuka jadi angin keluar; kabut jadi tetesan dan kabut biru; kelembapan tinggi jadi embun di kaca; lumut nyebar jadi kilau hijau; malam pas lampu mati, halo kunang-kunang nerangin toples.

Tes: UI 30/30 (file://) sama 32/32 (http WebGL + `--audio`), request 37/37, sim 9/9.

**Udah enak:**
- Momen kunang-kunang pertama sekarang kerasa jadi momen: ruangan meredup, kamera condong ke toples 1,12x, cahaya hangat nerangin lumut sama Pip, kilauan dan hati keluar dari Dot (bukan dari kartu di kiri lagi). Abis itu baru ucapan makasih sama kartu pos.
- Tiap angka sim sekarang punya tanda di toples:
  - angin keluar dari mulut toples pas tutup dibuka (sebab Fresh air naik)
  - kabut abu-abu pas udara pengap (< 35)
  - embun di kaca pas terlalu lembap (> 85)
  - spora melayang dari jamur busuk
  - kilau hijau pas lumut nyebar
- Malam lebih gelap kalau lampu mati, jadi kunang-kunang yang nerangin. Kunang-kunang yang ngambek cahayanya redup. Kunang-kunang saling jaga jarak, jadi 3 ga keliatan kayak 2.
- Bayi lahir kecil, dikasih hati, terus tumbuh selama satu hari.
- Waktu naruh makhluk ada debu tanah atau kilau, plus suara "plop" yang nadanya beda tiap jenis.

## M4 Suara (22 Okt)
- Semuanya CC0 (OpenGameArt, Kenney, BigSoundBank), lisensinya dicek di halaman masing-masing. Daftarnya di `docs/AUDIO-CREDITS.md`.
- 20 file, dibikin ogg (loop mulus) + mp3 (fallback Safari lama). Total 4,8 MB. Zip itch 5,64 MB (batasnya 10 MB).
- Musik:
  - siang: lagu cozy
  - malam: kotak musik, crossfade 2,5 detik pas senja
  - layar judul: lagu sendiri
- Ambience: burung kecil di siang hari, jangkrik di malam hari.
- SFX:
  - klik tombol
  - gabus dibuka / ditutup
  - semprot kabut + tetes
  - plop
  - biji (nadanya naik tiap biji mendarat)
  - catatan selesai
  - kartu pos
  - unlock
  - kalah, menang
  - lampu on/off
  - denting kunang-kunang (sekali tiap malam)
- Flag `?mute` bikin game ga load audio sama sekali. Tombol mute ada di judul sama di panel, dan pilihannya disimpan.
- Aku belum pernah denger satu pun, sesuai aturan tanpa suara. Pilihannya dari analisis: loudness, panjang, seam loop. Buat dengerin ada `docs/m4/sound-preview.mp4` (2 menit, tiap suara ada nama sama gunanya).
- Tesnya tanpa bunyi:
  - `?mute&audiotest` ngejalanin semua kode suara lewat sound manager yang di-mute (volume 0), di Chrome `--mute-audio`.
  - Semua 40 file di-decode pakai OfflineAudioContext, ga ada output.
- Ada loading bar "Growing the jar..." biar ga ada layar kosong pas audio lagi dimuat.

**Butuh Angel (opsional, kapan aja):** dengerin `docs/m4/sound-preview.mp4`. Kalau ada yang ga cocok, sebut aja namanya. Ada cadangan di shortlist, jadi gantinya tinggal 1 baris.

## Playtest ronde 2 + polish (22 Okt)
Playtest 4 persona (juri 3 menit, pemain sampai tamat, kritikus visual, pemburu bug) di Chrome headless mute + `?audiotest`.
- Hasil: 0 error konsol, 0 softlock, 0 leak (40 makhluk di free play aman), frame 16,7 ms stabil.
- Penilaian juri: tema simulasi 4,5/5, presentasi 4,5/5, fun 3,5/5. Titik lemahnya catatan Mo yang makan 85–138 detik dari sesi 3 menit.
- 8 dari 8 masalah top berhasil direproduksi, terus semuanya dibenerin.

**Dibenerin:**
- Ketukan tanam ga hilang lagi. Kartu toko selalu milih (ga toggle). Lumut yang diketuk di atas lumut pindah ke tanah kosong terdekat, jadi ga bayar sia-sia, dan muncul "+2.5%". Ketuk toples tanpa pilihan munculin "Pick something in the shop first".
- Catatan Mo:
  - target diturunin dari 40% ke 35%
  - satu tanaman lumut sekarang 0,5 (sebelumnya 0,35)
  - game otomatis 2x setelah onboarding ("Time now runs 2x")
  - petunjuknya ngikut keadaan ("Plant more moss: 1 seed each", "Moss grows in light. Try 4x!")
  - hasilnya: pemain pasif yang nanam 4 lumut sekitar 50 detik (sebelumnya 3,5 menit di 1x), pemain engaged median 0,54 hari, pemain diem tetap ga lolos
- Tombol speed muter 1x/2x/4x, Space buat pause.
- Cap pos ga nutupin ucapan kartu pos lagi.
- Ketukan nyasar pas momen wow atau ucapan makasih sekarang ga ngapa-ngapain. Tombol speed baru muncul abis makasihnya selesai.
- Chip: sebab sedih dulu, terus petunjuk, baru "Paused till dusk · try 4x". Hold yang udah selesai nunjukin jam penuh. Olive dapet penghitung jam.
- Baris sebab ga nyalahin tutup yang udah ditutup, dan cuma sumber yang gede yang ditampilin.
- Grafik:
  - skalanya ngikut jumlah data, jadi hari pertama ngisi kotak
  - labelnya "so far" sampai datanya 15 hari
- Kabut udara pengap mulai keliatan dari 45%. Angin dari tutup lebih sering.
- Kunang-kunang jaga jarak 60 px, dan halo-nya diredam kalau banyak yang nyala bareng (ga jadi gumpalan putih).
- Cuma pesta (catatan terakhir) yang sekarang punya momen gede sendiri: ruangan meredup, kamera mendekat, cahaya penuh toples, kilau + hati dari tiap kunang-kunang.
- Grid toko sekarang di tengah panel, dan "Mushroom" muat di kartunya.
- Teks dirender di resolusi layar (tajam di retina).
- Ikon mute digambar tangan (bukan emoji).
- Tutup gabus, lampu, sama portrait ikut redup pas malam.
- Overlay bisa ditutup pakai Enter/Space.
- Toast kabut nunjukin angka asli ("Already soaked!" kalau udah ≥ 95).
- "+1" sama "no seed" kebaca di malam hari.
- "+0 at midnight" disembunyiin.
- Free play: Rewind balik ke pagi hari ini, dan siput ga beranak lagi kalau udara < 50 (sebelumnya jumlahnya meledak terus mati semua).
- Musik dimuat di belakang layar pas layar judul. Ada teks "Growing the jar..." sebelum JS jalan. Ada kartu "putar HP" buat layar portrait.
- Typo "fireflys".

**Masih kebuka (kecil):**
- Baris chip kosong di kartu masih ninggalin celah.
- Kolase ending masih kecil.
- Free play belum ada tujuan atau tempat buat ngabisin biji.
