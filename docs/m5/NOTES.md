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
