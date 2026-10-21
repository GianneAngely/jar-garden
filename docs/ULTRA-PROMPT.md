# Prompt: Jar Garden sampai siap menang (ultracode / Fable)

Paste semua di bawah garis ke sesi BARU dengan folder kerja `~/Documents/Projects/JarGarden`. Kata "ultracode" di baris pertama sengaja ada biar Claude boleh pakai banyak agen paralel.

---

ultracode

Kamu lead developer "Jar Garden", game simulasi ekosistem mini dalam toples untuk **Game Gauntlet: SIM Jam** (https://itch.io/jam/game-gauntlet-sim-jam). Hadiah: juara 1 $1.000, juara 2 $500. Saat dicek ada sekitar 37 entri. **Deadline keras: Kamis 5 Nov 2026 03:00 WITA**, telat ga diterima. Target kita: **build lengkap yang bisa dimainin paling lambat 2 Nov**, sisanya buat polish dan persiapan submit.

## Baca dulu (wajib)
- `docs/PLAN.md`: milestone, model sim, prioritas buat menang, cut list. M1 (sim core) sama M2 (art + momen wow) udah selesai.
- `src/sim.js`, `tools/simtest.mjs`, `tools/test.mjs`: sim + tes yang udah ada (9 skenario balance, 14 tes UI).
- `~/Documents/Projects/angels-desk/BRIEF.md`: aturan studio (identitas commit, tanpa suara, Chrome bareng, approval).
- Memory: `web-games-five` (gaya game Angel: cozy, Phaser, pastel, Cake Tower).

## Cara kerja (pelajaran dari referensi Angel: https://www.threads.com/share/DhihXmMZI/)
1. **Jangan bikin semuanya sekaligus.** Kerjain satu sistem, mainin, nilai, baru lanjut ke sistem berikutnya. "Kalau satu sistem kerasa jelek, sistem berikutnya bakal kerasa lebih jelek."
2. **Dokumen 1 halaman dulu** sebelum kode: loop inti, tujuan 5 menit pertama, request tetangga, kondisi menang/kalah, gimana juri lihat "simulasi"-nya dalam 30 detik. Tulis di `docs/ONE-PAGER.md`.
3. **Satu palet, satu gaya.** Semua aset baru ngikut art M2 (gaya Cake Tower: pensil warna pastel, garis coklat). UI dikerjain paling akhir.
4. Tiap sistem selesai: tes otomatis + rekam GIF pendek (headless, MUTE) + catatan "kerasa enak atau ga, kenapa". Kalau belum enak, perbaiki dulu sebelum lanjut.

## Urutan sistem (sesuaikan kalau ada alasan kuat)
1. **M3a Request tetangga** (mode tujuan, 6 request, mulai dari tetangga landak yang art-nya udah ada): tiap request punya target sim yang jelas (misal "toples bisa jalan 3 hari tanpa dibuka", "5 kunang-kunang nyala malam ini"), feedback progres, hadiah biji.
2. **M3b Onboarding 30 detik**: pemain ngerti tutup/lampu/kabut + 1 makhluk tanpa baca teks panjang.
3. **M3c Layar judul + kartu pos penutup request.**
4. **M3d Ekonomi biji**: sekarang kemurahan (240 biji / 20 hari). Tuning pakai `simtest` sampai ada pilihan yang berarti.
5. **M4 Sound** (CC0 aja, catat lisensi tiap file, harus ada flag mute + tombol mute) + **juice** (tween, partikel, squash, tanda sebab-akibat tiap angka) + balance pass. Skill yang bisa dipakai: `gamedev-skills:game-feel`, `gamedev-skills:phaser-core`, `gamedev-skills:game-ui-ux`, `gamedev-skills:game-jam`.
6. **M5 Persiapan rilis**: draf halaman itch (EN, jelasin kenapa ini SIMULATION, kontrol, kredit, **disclosure AI: Graphics + Code**), cover/screenshot/GIF, trailer pendek 20–30 detik (render offline, mute pas preview), tes browser (Chrome/Safari/Firefox, ukuran HP sama desktop), zip itch < 10 MB.

Kalau waktunya mepet, potong sesuai urutan di cut list PLAN.md.

## Biar menang
- **Simnya kelihatan hidup dan kebaca**: tiap angka punya sebab yang kelihatan (gelembung mood, lumut nyebar, jamur busuk merayap, grafik).
- **Satu momen wow** (malam, lampu mati, kunang-kunang nyala) yang gampang dijadiin GIF.
- **Pemain langsung ngerti dalam 30 detik.** Ga ada bug atau layar kosong.
- Juri main puluhan game, jadi 60 detik pertama harus bikin senyum.

## Aturan keras
- **Tanpa suara, kapan pun.** Headless Chrome pakai `--mute-audio`, URL tes pakai `?mute`. Jangan buka tab tes di Chrome Angel.
- **Git:** repo PRIVATE `GianneAngely/jar-garden`. Commit cuma atas nama `GianneAngely <168960346+GianneAngely@users.noreply.github.com>`. **Tanpa Co-Authored-By atau tulisan AI apa pun.** Push abis tiap milestone.
- **Art baru:** pakai Google Flow `/u/2` (sisa budget sekitar 20 generasi dari 40). Chrome dipakai bareng sesi lain, jadi minta giliran ke manager ("Angel's Desk") pakai send_message. Kalau ga perlu Flow, gambar sendiri pakai kode.
- **Audio/aset:** cuma yang lisensinya jelas (CC0, atau CC-BY plus kredit). Jangan ambil dari YouTube/TikTok/Pinterest.
- **Jangan submit ke jam, jangan upload publik, jangan posting apa pun.** Abis siap, lapor ke manager. Submit cuma kalau Angel bilang oke langsung. Langkah yang harus Angel kerjain sendiri (attestation form, username Discord) cukup tulis daftarnya.
- Sesi lama "Game jam: Game Gauntlet SIM + Slapjam #2" udah disuruh berhenti ngedit Jar Garden, jadi kamu satu-satunya yang ngubah repo ini. Template Slapjam (`~/Documents/Projects/PortraitJamKit`) jangan diubah.

## Lapor
Tiap milestone selesai: kirim ke manager ("Angel's Desk", pakai send_message) maksimal 8 baris + path GIF/screenshot. Jangan lapor tiap langkah kecil.
