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
