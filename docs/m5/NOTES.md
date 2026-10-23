# Catatan M5 (persiapan rilis) + polish

## Udah siap (22 Okt)
- **Halaman itch (EN):** `docs/m5/ITCH-PAGE.md`. Isinya ngikut syarat jam: hubungan sama tema, kontrol, satu kalimat soal apa yang disimulasiin, kredit, sama disclosure AI.
- **Checklist submit buat Angel (ID):** `docs/m5/SUBMIT-CHECKLIST.md`.
- **Cover A/B/C:** `docs/m5/cover-ABC.jpg`. Default-ku B, toples malam yang lagi nyala.
- **Screenshot itch:** `docs/m5/shots/` 1–5, ukuran 1280×720. Direkam ulang pakai `node tools/scenes/itch-shots.mjs`.
- **Trailer 29,8 detik:** `docs/m5/trailer.mp4`.
  - Urutannya: judul, onboarding, momen wow, kartu pos, montase lumut + biji, finale pesta, kolase, kartu penutup.
  - Audionya disusun offline dari tanda suara (`tools/mux.mjs`), belum pernah kudengar.
- **Tes browser:**
  - Chrome: `tools/test.mjs` (file:// dan `--http --audio`)
  - Firefox + WebKit/Safari: `tools/xbrowser/smoke.mjs`
  - Ukuran desktop 1280, laptop 1024, HP landscape. HP portrait dapet kartu "putar HP".
- **Zip itch:** `dist/jar-garden.zip` 5,64 MB. Udah dites dari hasil ekstrak dan jalan.

## Polish setelah M5
- **Jar guide** (tombol "?"): satu kartu isinya kebutuhan, hasil, sama makanan tiap makhluk, plus arti gelembung. Buat kriteria Systems / Theme.
- **Autosave:** game kesimpen setelah catatan 1, tiap catatan, dan tiap tengah malam. Layar judul nampilin Continue atau New jar. Run tes yang pakai `?seed` ga pernah nyimpen.
- **Performa:**
  - Graphics statis di-bake jadi tekstur sekali.
  - Kartu toko cuma di-paint ulang kalau berubah.
  - Grafik dirender ke RenderTexture.
  - Jam di panel kelipatan 15 menit.
  - Hasilnya: CPU 4x lebih lambat stabil 60 fps (sebelumnya sering 30); 6x, p50 60 fps.
- Baris chip kosong di kartu udah nutup. Kartu pos di kolase ending bisa diklik buat diperbesar.

## Code review adversarial (22 Okt)
- Ada 3 reviewer: siklus state/save/rewind, siklus scene/timer, sama input/edge case.
- 9 temuan, semuanya berhasil direproduksi di headless, terus semuanya dibenerin:
  - **Parah:** pemain yang diem lama di "Lamp off!" bikin Dot mati, terus onboarding nyangkut selamanya (jam ditahan, semua tombol kekunci). Sekarang ga ada makhluk yang bisa mati selama onboarding. Udah ada tes regresinya di `reqtest`.
  - Rewind setelah Continue sekarang balik ke awal catatan (titik Rewind disimpen terpisah), bukan ke tengah malam terakhir.
  - Halaman yang ditutup pas pesta tetap nampilin "Party night!" pas Continue.
  - Kartu catatan mulai dalam keadaan tersembunyi, jadi pas Continue toples yang udah menang ga ada ikon biji nyasar.
  - Tombol "New jar" ga bisa ngapus simpanan pas lagi transisi Continue.
  - SFX ga numpuk pas tab ga fokus.
  - Toples berhenti pas kartu "putar HP" nutupin layar.
  - Musik ga kedownload dua kali.
- Tes: semuanya lolos (sim, request 38, UI file + http/audio, Firefox + WebKit).

## QA visual gaya pixel (23 Okt)
- Agen QA ngecek build pixel art dari layar ke layar dan nemu 26 hal. Semua P1 dan P2 udah dibenerin, P3 cuma yang murah.
- **Prinsipnya:** tiap piksel art harus tampil seukuran. Jadi ga ada lagi skala pecahan, rotasi, atau zoom kamera. Gerakan diganti geser, ganti frame, atau warna.
- **Aset baru** (dibikin pakai `tools/px_fit.py`, tanpa Flow):
  - ikon setengah ukuran (`-s`)
  - makhluk mini buat bayi, pakis muda, dan baris kartu
  - bohlam nyala/mati yang dipotong dari gambar ruangan (lihat bagian berikutnya)
  - kunang-kunang siang yang ga nyala
  - ruangan 320x180, jadi strip 4 px di bawah layar ilang
- **Di toples:**
  - Gelembung kebutuhan (r18, ikon mini) sekarang punya layer sendiri di atas kaca dan cahaya.
  - Pakis sama jamur pindah ke belakang hewan.
  - Kunang-kunang siang duduk di belakang siput.
  - Lumut, jamur, dan daun tumbuh ke atas: barisnya kebuka satu-satu, tanpa diskala.
  - Bayi sama pakis muda pakai sprite mini. Makhluk yang sedih jadi abu kebiruan, ga miring lagi.
  - Tutup gabus geser tanpa miring. Momen nyala ga pakai zoom kamera.
  - Kaca ikut gelap pas malam. Ada bayangan di bawah toples.
- **Kartu pos:**
  - Fotonya sekarang seluruh toples plus gabus, pas setengah ukuran.
  - Kartu ga miring lagi. Di kolase ukurannya 0.5, kalau diklik jadi 1.
  - Prangko pakai wajah 1x. Cap pos bulat dengan teks lurus.
- **UI:**
  - Ikon tombol dan kartu pakai versi mini.
  - Tetangga yang tinggi berdiri lebih rendah, jadi kepalanya ga ketutup kartu. Lineup pesta geser biar katak ga kepotong tombol.
  - Legenda panduan diatur sesuai lebar teks.
  - Credit di judul kebaca. Kunang-kunang judul pindah ke toples.
  - Tombol Play goyang 4 px, bukan skala.
  - Cahaya sama percikan sekarang bertingkat per 4 px kayak cahaya pixel art.
  - Kanvas yang tampil lebih kecil dari 1280x720 piksel perangkat pakai smoothing, biar baris piksel ga ilang.
- **Belum:** semuanya udah dikerjain di bagian berikutnya.
- **Tes:** sim, request 38, UI, sama Firefox + WebKit semuanya lolos. Cover, 5 screenshot, dan trailer direkam ulang.

## Sisa QA + self-review (23 Okt)
- **Teks di HP:** kalau kanvas tampil di bawah 70% ukuran aslinya (HP landscape kira-kira 54%), teks yang wajib dibaca naik dari 16 ke 24 px. Isinya pil coach, toast, tooltip, sama permintaan di kartu catatan. Tombol sama kartu toko tetap 16 px, soalnya tempatnya ga cukup.
- **Panah coach sama ekor kartu** sekarang digambar per baris 2 px, ga lagi pakai garis miring yang halus.
- **Lampu:** sekarang pakai lampu dari gambar ruangannya sendiri. Kode cuma ngegambar bohlamnya (nyala kuning atau mati abu), dipotong dari piksel ruangan, jadi bentuk sama warnanya pasti pas. Sprite `lamp` lama udah dihapus.
- **Cahaya:** pitanya sekarang per piksel tekstur, jadi cahaya lampu yang diskala 6x punya tangga 6 px, bukan kotak 24 px.
- **Alat:** `tools/cdp.mjs` ga crash lagi kalau Chrome masih nulis ke folder profil pas ditutup.
- **Self-review:** seluruh diff sejak build pixel udah dibaca ulang (lapisan, bubble, crop, tooltip, kartu pos, tombol). Ga ada bug baru.
- **Tes:** sim, request 38, UI, sama Firefox + WebKit semuanya lolos. Cover, shot, trailer, sama GIF direkam ulang.
