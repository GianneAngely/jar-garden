# Catatan per sistem (M3)

## M3a Request tetangga (22 Okt)
GIF: `docs/m3/m3a-notes.gif` (catatan Mo dari awal sampai selesai, terus Olive datang)

Tes: `node tools/reqtest.mjs` (32/32 lolos), `node tools/test.mjs` (22/22), `node tools/simtest.mjs` (9/9).
- Ada 6 catatan di satu toples: Hazel, Mo, Olive, Fen, Hazel, terus pesta.
- Pemain yang serius main lolos 20/20, median 5,5 hari in-game (sekitar 5–9 menit di 2x).
- Pemain yang diem atau salah strategi ga pernah lolos.

**Udah enak:**
- Kartunya kebaca sekilas: siapa yang minta, apa yang diminta, meter yang bergerak, sama hadiahnya.
- Di catatan Mo, 20 titik tanah keisi satu-satu pas lumutnya nyebar. Sebab-akibatnya keliatan langsung.
- Pas catatan selesai: tulisan "Thank you!", hati-hati keluar, biji terbang ke penghitung, tetangganya mantul terus pergi, dan tetangga baru naik dari bawah. Momen ini kerasa kayak hadiah.
- Kartu toko yang masih kekunci nulis "after note N", jadi pemain tau ada yang bakal kebuka.
- Lampu nyala malam-malam bikin Dot keluar gelembung bohlam. Tukar-tambahnya (lumut cepat tumbuh, tapi Dot ngambek) keliatan tanpa harus dijelasin.

**Belum enak, udah dibenerin:**
- Lumut 40% keliatan tipis banget. Sekarang ukurannya digedein, jadi 40% keliatan kayak karpet.
- Toast "Moss added!" nempel terus selama mode tanam. Sekarang toast-nya hilang sendiri. Ketuk di luar toples buat keluar dari mode tanam.
- Dua catatan bisa selesai barengan, terus kartunya tabrakan. Sekarang ada antrian ucapan makasih, dan tiap catatan tetap kebaca sebentar.
- Event kalah kepanggil tiap tick, jadi overlay-nya numpuk. Sekarang cuma muncul sekali, dan Rewind balik ke awal catatan.
- Tombol lampu bilang "off" padahal lampunya nyala. Sekarang tombol ngikutin keadaan toples.

**Masih kurang, dikerjain di sistem berikutnya:**
- 30 detik pertama belum ada panduan (itu M3b). Pemain baru cuma liat kartu Hazel sama gelembung udara di Pip.
- Masih ada baris chip kosong di kartu kalau lagi ga ada petunjuk. Kecil, nanti dirapihin di M4.
- Malamnya gelap banget buat ngeliat progres. Nanti di M4: cahaya lembut kunang-kunang ke lumut.
- Belum ada suara (itu M4).
- Seed pop dari makhluk yang ngehasilin biji, sama keterangan sebab di bar ("▲ plants ▼ snail"), masuk M4. Data `s.flux` udah ada di sim.
- Satu dari 20 pemain butuh 3,9 hari di catatan pesta, biasanya gara-gara springtail kelaparan. Dicek lagi pas M3d.

## M3b Onboarding 30 detik (22 Okt)
GIF: `docs/m3/m3b-onboarding.gif` (main beneran di 1x, ngikutin panah coach)

Tes: `node tools/test.mjs` (25/25).
- Onboarding dimainin lewat klik beneran: buka tutup, tutup lagi, kabut, kunang-kunang, matiin lampu, terus nyala.
- Kontrol yang dikunci ga ngapa-ngapain.
- Kunang-kunang nyala di 14,5 detik kalau klik cepat, sekitar 20 detik di GIF. Kalau pemain lambat (3x), dicek di reqtest: 50 detik.

**Udah enak:**
- Satu kalimat pendek tiap langkah, dan panah kuning mantul di satu tombol yang aktif. Ga ada teks panjang.
- Bar yang lagi berubah ikut nyala kuning: Fresh air pas tutup dibuka, Humidity pas kabut, Light pas senja. Jadi pemain liat angka mana yang berubah karena aksinya.
- Tiap langkah selesai berdasarkan keadaan sim, bukan klik. Pemain yang buru-buru (misalnya matiin lampu duluan) tetap lanjut tanpa nyangkut.
- Pas nunggu senja, waktunya dipercepat 4x. Langit gelap dalam sekitar 3 detik, ga ada jeda mati 10 detik.
- Dot ngeluarin gelembung bohlam pas lampu nyala malam. Pesannya jelas: lampu itu masalahnya.

**Belum enak, udah dibenerin:**
- Tooltip makhluk langsung kebuka pas makhluknya ditaruh. Sekarang tooltip muncul pas pointerdown.
- Status note 1 masih bilang "Wait for the dark" padahal udah malam. Sekarang tulisannya "Turn the lamp off".
- Toast "Firefly added!" numpuk sama label coach. Toast-nya sekarang diem selama onboarding.
- Rewind bisa balik ke toples yang semua hewannya udah mati. Snapshot sekarang cuma diambil kalau masih ada hewan hidup.

**Masih kurang:**
- Momen kunang-kunang nyala masih kecil di layar. Di M4 cahayanya digedein, ada sinar lembut ke lumut, partikel, dan suara lembut.
- Belum ada layar judul, jadi game langsung mulai di toples (itu M3c).

## M3c Layar judul + kartu pos (22 Okt)
GIF: `docs/m3/m3c-title-postcards.gif` (judul, Play, kartu pos Hazel berisi foto toples sendiri, kolase 6 kartu pos di akhir)

Tes: `node tools/test.mjs` (27/27, file:// Canvas) sama `node tools/test.mjs --http` (28/28, WebGL GPU kayak di itch, termasuk cek foto kartu pos).

**Udah enak:**
- Layar judul pakai key art M2 sama logo A sementara (lumut + tunas), plus tagline "a tiny living world in a jar". Ada satu tombol Play yang berdenyut, dan kunang-kunang melayang di sekitar toples. Enter atau Space juga langsung main.
- Kartu pos muncul tiap catatan selesai. Fotonya toples pemain sendiri pas momen itu (misalnya Dot lagi nyala). Ada juga perangko muka tetangga, cap pos "DAY n", sama ucapan makasih yang pendek.
- Layar akhir "Party night!" ngumpulin 6 kartu pos jadi cerita toples dari hari ke hari, plus angka (hari, bayi lahir, jumlah jenis). Tombol "Keep playing" buat lanjut free play.

**Belum enak, udah dibenerin:**
- Di file:// (Canvas) foto toples ga bisa diambil karena canvas-nya tainted. Kartu pos sekarang otomatis pakai gambar tetangga. Di itch (http, WebGL) fotonya jalan.
- Swiftshader headless cuma jalan 3 fps di WebGL. Alat tes sama recorder sekarang pakai GPU Metal (60 fps) buat mode `--http`.
- Recorder macet pas nunggu foto WebGL, soalnya loop-nya di-pause. Sekarang skenario nge-render satu frame buat tiap foto.

**Masih kurang:**
- Logo sama tetangga masih pilihan sementara, nunggu Angel milih (lembar A/B/C udah dikirim).
- Kanan layar judul masih kosong (dinding). Mungkin nanti ditaruh kredit kecil atau tanaman gantung bergoyang.
- Belum ada musik di layar judul (itu M4).
